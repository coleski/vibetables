import { AppLogo } from '@conar/ui/components/brand/app-logo'
import { ReactFlowEdge } from '@conar/ui/components/react-flow/edge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@conar/ui/components/select'
import { useMountedEffect } from '@conar/ui/hookas/use-mounted-effect'
import { createFileRoute } from '@tanstack/react-router'
import { Background, BackgroundVariant, MiniMap, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState } from '@xyflow/react'
import { useCallback, useEffect, useEffectEvent, useMemo, useState } from 'react'
import { animationHooks } from '~/enter'
import { databaseTableColumnsQuery, databaseTableConstraintsQuery, ReactFlowNode, tablesAndSchemasQuery } from '~/entities/database'
import { databaseForeignKeysQuery } from '~/entities/database/queries/foreign-keys'
import { queryClient } from '~/main'
import { getEdges, getLayoutedElements, getNodes } from './-lib'

export const Route = createFileRoute(
  '/(protected)/_protected/database/$id/visualizer/',
)({
  loader: async ({ context }) => {
    const tablesAndSchemas = await queryClient.ensureQueryData(tablesAndSchemasQuery({ database: context.database }))
      .then(data => data.schemas.flatMap(({ name, tables }) => tables.map(table => ({ schema: name, table }))))
    const foreignKeys = await queryClient.ensureQueryData(databaseForeignKeysQuery({ database: context.database }))

    return {
      tablesAndSchemas,
      foreignKeys,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()

  return (
    // Need to re-render the whole visualizer when the database changes due to recalculation of sizes
    <ReactFlowProvider key={id}>
      <Visualizer />
    </ReactFlowProvider>
  )
}

const nodeTypes = {
  tableNode: ReactFlowNode,
}
const edgeTypes = {
  custom: ReactFlowEdge,
}

function Visualizer() {
  const { id } = Route.useParams()
  const { database } = Route.useRouteContext()
  const { tablesAndSchemas, foreignKeys } = Route.useLoaderData()
  const [columns, setColumns] = useState<any[]>([])
  const [constraints, setConstraints] = useState<any[]>([])
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, stage: '' })
  const [isLoading, setIsLoading] = useState(true)

  const schemas = useMemo(() => [...new Set(tablesAndSchemas.map(({ schema }) => schema))], [tablesAndSchemas])
  const [schema, setSchema] = useState(schemas[0]!)
  const schemaTables = useMemo(() => tablesAndSchemas
    .filter(t => t.schema === schema)
    .map(({ table }) => table), [tablesAndSchemas, schema])

  // Batch fetch data with progress updates
  useEffect(() => {
    const BATCH_SIZE = 5
    const batchFetch = async <T,>(
      items: Array<{ schema: string, table: string }>,
      fetchFn: (schema: string, table: string) => Promise<T>,
      stage: string,
    ): Promise<T[]> => {
      const results: T[] = []
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE)
        setLoadingProgress({ current: i, total: items.length, stage })
        const batchResults = await Promise.all(
          batch.map(({ schema, table }) => fetchFn(schema, table)),
        )
        results.push(...batchResults)
      }
      return results
    }

    const loadData = async () => {
      setIsLoading(true)
      try {
        const cols = (await batchFetch(
          tablesAndSchemas,
          async (schema, table) => {
            return queryClient.ensureQueryData(databaseTableColumnsQuery({ database, schema, table }))
          },
          'Loading columns',
        )).flat()
        setColumns(cols)
        setIsLoading(false) // Show visualizer once columns are loaded

        // Load constraints in background
        const cons = (await batchFetch(
          tablesAndSchemas,
          async (schema, table) => {
            return queryClient.ensureQueryData(databaseTableConstraintsQuery({ database, schema, table }))
          },
          'Loading constraints',
        )).flat()
        setConstraints(cons)
        setLoadingProgress({ current: 0, total: 0, stage: '' }) // Clear loading state
      }
      catch (error) {
        setIsLoading(false)
        throw error
      }
    }

    loadData()
  }, [database, tablesAndSchemas])

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    if (isLoading || columns.length === 0) {
      return { nodes: [], edges: [] }
    }
    const edges = getEdges({ foreignKeys })
    return getLayoutedElements(
      getNodes({
        databaseId: id,
        schema,
        tables: schemaTables,
        columns,
        edges,
        foreignKeys,
        constraints,
      }),
      edges,
    )
  }, [id, schema, schemaTables, columns, foreignKeys, constraints, isLoading])

  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges)
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes)

  const recalculateLayout = useCallback(() => {
    if (isLoading || columns.length === 0) return
    const edges = getEdges({ foreignKeys })
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      getNodes({
        databaseId: id,
        schema,
        tables: schemaTables,
        columns,
        edges,
        foreignKeys,
        constraints,
      }),
      edges,
    )

    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [id, schema, schemaTables, columns, foreignKeys, constraints, setNodes, setEdges, isLoading])

  const recalculateLayoutEvent = useEffectEvent(recalculateLayout)

  useEffect(() => {
    // It's needed for fixing lines between nodes
    // Because lines started calculation before the app loaded
    return animationHooks.hook('finished', () => {
      recalculateLayoutEvent()
    })
  }, [])

  useMountedEffect(() => {
    recalculateLayout()
  }, [schema, recalculateLayout])

  if (isLoading) {
    return (
      <div className="size-full flex flex-col items-center border rounded-lg justify-center bg-background gap-4">
        <AppLogo className="size-40 text-muted-foreground animate-pulse" />
        <div className="text-center">
          <div className="text-lg font-medium">{loadingProgress.stage}</div>
          <div className="text-sm text-muted-foreground">
            {loadingProgress.current} / {loadingProgress.total} tables
          </div>
          <div className="w-64 h-2 bg-muted rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative size-full overflow-hidden rounded-lg border/10 dark:border">
      {loadingProgress.stage && (
        <div className="absolute z-20 top-2 left-2 bg-background/95 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-lg">
          <div className="text-xs font-medium">{loadingProgress.stage}</div>
          <div className="text-xs text-muted-foreground">
            {loadingProgress.current} / {loadingProgress.total}
          </div>
        </div>
      )}
      <div className="absolute z-10 top-2 right-2">
        <Select
          value={schema}
          onValueChange={setSchema}
        >
          <SelectTrigger>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                schema
              </span>
              <SelectValue placeholder="Select schema" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {schemas.map(schema => (
              <SelectItem key={schema} value={schema}>
                {schema}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ReactFlow
        key={schema}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        panOnScroll
        selectionOnDrag
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.3}
        maxZoom={4}
        defaultEdgeOptions={{
          type: 'custom',
        }}
        style={
          {
            '--xy-background-pattern-dots-color-default': 'var(--color-border)',
            '--xy-edge-stroke-width-default': 1.5,
            '--xy-edge-stroke-default': 'var(--color-foreground)',
            '--xy-edge-stroke-selected-default': 'var(--color-foreground)',
            '--xy-attribution-background-color-default': 'transparent',
          } as React.CSSProperties
        }
        attributionPosition="bottom-left"
      >
        <Background bgColor="var(--background)" variant={BackgroundVariant.Dots} gap={20} size={2} />
        <MiniMap
          pannable
          zoomable
          bgColor="var(--background)"
          nodeColor="var(--muted)"
        />
      </ReactFlow>
    </div>
  )
}
