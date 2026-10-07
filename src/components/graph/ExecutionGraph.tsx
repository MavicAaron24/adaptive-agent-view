import { useEffect, useMemo, useState } from 'react';
import { applyNodeChanges, Background, BackgroundVariant, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow, MarkerType, type Edge } from '@xyflow/react';
import { Crosshair, Maximize, Minus, Plus, Scan, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskNode, type TaskFlowNode } from './TaskNode';
import type { ExecutionTask } from '@/types/execution';
import '@xyflow/react/dist/style.css';
const nodeTypes = { task: TaskNode };
interface Props { tasks: ExecutionTask[]; conceptual: boolean; selectedId?: string | undefined; onSelect: (task: ExecutionTask) => void }
function layout(tasks: ExecutionTask[], conceptual: boolean): TaskFlowNode[] {
  const levels = new Map<string, number>();
  const getLevel = (id: string, path: Set<string>): number => {
    if (levels.has(id)) return levels.get(id) ?? 0;
    if (path.has(id)) return 0;
    const task = tasks.find(t => t.id === id); const next = new Set(path); next.add(id);
    const deps = task?.dependencies.filter(d => tasks.some(t => t.id === d)) ?? [];
    const level = deps.length ? Math.min(12, Math.max(...deps.map(d => getLevel(d, next))) + 1) : 0;
    levels.set(id, level); return level;
  };
  tasks.forEach(t => getLevel(t.id, new Set()));
  // Conceptual presentation groups the entry points vertically; real runs use only declared dependencies.
  if (conceptual) { ['user', 'api'].forEach(id => levels.set(id, 0)); levels.set('planner', 1); levels.set('graph', 1); levels.set('orchestrator', 2); ['agents', 'tools', 'rag'].forEach(id => levels.set(id, 3)); levels.set('evaluator', 4); levels.set('synthesis', 5); }
  const grouped = new Map<number, ExecutionTask[]>();
  tasks.forEach(t => { const level = levels.get(t.id) ?? 0; grouped.set(level, [...(grouped.get(level) ?? []), t]); });
  return tasks.map(t => { const level = levels.get(t.id) ?? 0; const lane = grouped.get(level) ?? []; const index = lane.findIndex(v => v.id === t.id); return { id: t.id, type: 'task', position: { x: level * 255, y: (index - (lane.length - 1) / 2) * 215 + 270 }, data: { task: t, conceptual } }; });
}
function GraphInner({ tasks, conceptual, selectedId, onSelect }: Props) {
  const flow = useReactFlow<TaskFlowNode>();
  const [zoom, setZoom] = useState(100);
  const initialNodes = useMemo(() => layout(tasks, conceptual), [tasks, conceptual]);
  const [nodes, setNodes] = useState(initialNodes);
  useEffect(() => { setNodes(initialNodes); const timer = setTimeout(() => flow.fitView({ padding: .12, duration: 350, maxZoom: 1 }), 70); return () => clearTimeout(timer); }, [initialNodes, flow]);
  const edges: Edge[] = useMemo(() => tasks.flatMap(t => t.dependencies.filter(id => tasks.some(task => task.id === id)).map(id => ({ id: `${id}-${t.id}`, source: id, target: t.id, type: 'smoothstep', animated: t.status === 'RUNNING', className: selectedId && (selectedId === id || selectedId === t.id) ? 'edge-highlighted' : '', markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 } }))), [tasks, selectedId]);
  return <div className="graph-surface"><ReactFlow<TaskFlowNode> nodes={nodes.map(n => ({ ...n, selected: n.id === selectedId }))} edges={edges} nodeTypes={nodeTypes} onNodesChange={changes => setNodes(current => applyNodeChanges(changes, current))} onNodeClick={(_, node) => onSelect(node.data.task)} onMove={(_, viewport) => setZoom(Math.round(viewport.zoom * 100))} fitView minZoom={.15} maxZoom={1.8} nodesConnectable={false} deleteKeyCode={null} proOptions={{ hideAttribution: true }}>
    <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
    <MiniMap pannable zoomable nodeBorderRadius={3} nodeStrokeWidth={0} />
  </ReactFlow>
  {!tasks.length && <div className="graph-empty"><Network size={35}/><h2>Ready for your next task</h2><p>No execution graph yet</p></div>}
  <div className="graph-tools"><Button size="icon" variant="ghost" title="Zoom in" aria-label="Zoom in" onClick={() => flow.zoomIn({ duration: 150 })}><Plus/></Button><Button size="icon" variant="ghost" title="Zoom out" aria-label="Zoom out" onClick={() => flow.zoomOut({ duration: 150 })}><Minus/></Button><span>{zoom}%</span><i/><Button size="icon" variant="ghost" title="Fit graph" aria-label="Fit graph" onClick={() => flow.fitView({ padding: .12, duration: 250 })}><Maximize/></Button><Button size="icon" variant="ghost" title="Focus selected node" aria-label="Focus selected node" disabled={!selectedId} onClick={() => { const node = nodes.find(n => n.id === selectedId); if (node) flow.fitView({ nodes: [node], duration: 250, maxZoom: 1 }); }}><Crosshair/></Button></div>
  <div className="canvas-watermark"><Scan size={12}/><span>{conceptual ? 'CONCEPTUAL SYSTEM MAP' : 'EXECUTION TASK GRAPH'}</span></div>
  </div>;
}
export function ExecutionGraph(props: Props) { return <ReactFlowProvider><GraphInner {...props}/></ReactFlowProvider>; }
