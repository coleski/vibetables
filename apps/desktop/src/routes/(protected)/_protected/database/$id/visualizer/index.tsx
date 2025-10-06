import { AppLogo } from '@conar/ui/components/brand/app-logo'
import { ReactFlowEdge } from '@conar/ui/components/react-flow/edge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@conar/ui/components/select'
import { useMountedEffect } from '@conar/ui/hookas/use-mounted-effect'
import { useQueries } from '@tanstack/react-query'
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

  const schemas = useMemo(() => [...new Set(tablesAndSchemas.map(({ schema }) => schema))], [tablesAndSchemas])
  const [schema, setSchema] = useState(schemas[0]!)
  const schemaTables = useMemo(() => tablesAndSchemas
    .filter(t => t.schema === schema)
    .map(({ table }) => table), [tablesAndSchemas, schema])

  // Fetch columns for all tables using React Query (with caching)
  const columnQueries = useQueries({
    queries: tablesAndSchemas.map(({ schema, table }) => ({
      ...databaseTableColumnsQuery({ database, schema, table }),
      staleTime: Infinity, // Keep cached data forever
    })),
  })

  // Fetch constraints for all tables using React Query (with caching)
  const constraintQueries = useQueries({
    queries: tablesAndSchemas.map(({ schema, table }) => ({
      ...databaseTableConstraintsQuery({ database, schema, table }),
      staleTime: Infinity, // Keep cached data forever
    })),
  })

  const columnsLoading = columnQueries.some(q => q.isLoading)
  const constraintsLoading = constraintQueries.some(q => q.isLoading)
  const columnsLoaded = columnQueries.filter(q => q.isSuccess).length
  const constraintsLoaded = constraintQueries.filter(q => q.isSuccess).length

  // Stable columns and constraints arrays
  const columns = useMemo(() => columnQueries.flatMap(q => q.data ?? []), [columnsLoaded])
  const constraints = useMemo(() => constraintQueries.flatMap(q => q.data ?? []), [constraintsLoaded])

  const loadingProgress = {
    current: columnsLoading ? columnsLoaded : constraintsLoaded,
    total: tablesAndSchemas.length,
    stage: columnsLoading ? 'Loading columns' : (constraintsLoading ? 'Loading constraints' : ''),
  }

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    if (columnsLoading || columns.length === 0) {
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
  }, [id, schema, schemaTables, columnsLoading, columns, constraints, foreignKeys])

  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges)
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes)

  const recalculateLayout = useCallback(() => {
    if (columnsLoading || columns.length === 0)
      return
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
  }, [id, schema, schemaTables, columnsLoading, columns, constraints, foreignKeys, setNodes, setEdges])

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

  if (columnsLoading) {
    return (
      <div className="size-full flex flex-col items-center border rounded-lg justify-center bg-background gap-4">
        <AppLogo className="size-40 text-muted-foreground animate-pulse" />
        <div className="text-center">
          <div className="text-lg font-medium">{loadingProgress.stage}</div>
          <div className="text-sm text-muted-foreground">
            {loadingProgress.current}
            {' '}
            /
            {loadingProgress.total}
            {' '}
            tables
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
            {loadingProgress.current}
            {' '}
            /
            {loadingProgress.total}
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
