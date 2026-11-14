import { createRef, useMemo, useRef } from 'react'
import { Globe, Server, User } from 'lucide-react'
import { AnimatedBeam } from '../../components/ui/animated-beam'

export interface DataFlowOrigin {
  id: number
  name: string
  addr: string
  isOn: boolean
}

const EDGE_NODE_COUNT = 3

// 数据流示意图: 用户 -> Edge 节点 (固定3个) -> 源站 (数量随网站)
export function DataFlowDiagram({ origins }: { origins: DataFlowOrigin[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useMemo(
    () => Array.from({ length: EDGE_NODE_COUNT }, () => createRef<HTMLDivElement>()),
    [],
  )
  const originRefs = useMemo(() => origins.map(() => createRef<HTMLDivElement>()), [origins])

  return (
    <div
      ref={containerRef}
      className="relative mb-4 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-6 py-6"
    >
      <div className="relative z-10 grid grid-cols-3 items-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="text-xs text-neutral-500">用户</div>
          <div
            ref={userRef}
            className="flex h-12 w-24 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white text-sm font-medium text-neutral-700 shadow-sm"
          >
            <User className="h-4 w-4 text-blue-500" />
            用户
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="text-xs text-neutral-500">Edge 节点</div>
          {nodeRefs.map((ref, index) => (
            <div
              key={index}
              ref={ref}
              className="flex h-12 w-32 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-700 shadow-sm"
            >
              <Server className="h-4 w-4 text-blue-500" />
              Edge 节点 {index + 1}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="text-xs text-neutral-500">源站</div>
          {origins.length === 0 ? (
            <div className="flex h-12 w-40 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-400">
              无源站
            </div>
          ) : (
            origins.map((origin, index) => (
              <div
                key={origin.id}
                ref={originRefs[index]}
                className="flex h-12 w-40 flex-col items-center justify-center rounded-lg border border-neutral-200 bg-white text-xs text-neutral-700 shadow-sm"
              >
                <span className="flex items-center gap-1 font-medium">
                  <Globe className="h-3.5 w-3.5 text-emerald-500" />
                  {origin.name || origin.addr}
                </span>
                {origin.name ? <span className="text-neutral-400">{origin.addr}</span> : null}
              </div>
            ))
          )}
        </div>
      </div>

      {nodeRefs.map((nodeRef, index) => (
        <AnimatedBeam
          key={`user-node-${index}`}
          containerRef={containerRef}
          fromRef={userRef}
          toRef={nodeRef}
          duration={3}
          delay={index * 0.4}
          pathColor="#bfdbfe"
          pathWidth={1.5}
          pathOpacity={0.5}
          gradientStartColor="#3b82f6"
          gradientStopColor="#60a5fa"
        />
      ))}
      {origins.map((_, originIndex) =>
        nodeRefs.map((nodeRef, nodeIndex) => (
          <AnimatedBeam
            key={`node-${nodeIndex}-origin-${originIndex}`}
            containerRef={containerRef}
            fromRef={nodeRef}
            toRef={originRefs[originIndex]}
            duration={3}
            delay={0.2 * (nodeIndex + originIndex)}
            pathColor="#a7f3d0"
            pathWidth={1.5}
            pathOpacity={0.5}
            gradientStartColor="#10b981"
            gradientStopColor="#34d399"
          />
        )),
      )}
    </div>
  )
}
