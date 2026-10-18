import Visualizer from './Visualizer.tsx'
import { vizFor } from '../viz/index.ts'

/** The visualisation for a technique id; loaded lazily by the technique sheet, so the recorded runs are not in the main bundle. */
export default function TechniqueViz({ id }: { id: string }) {
  const viz = vizFor(id)
  return viz ? <Visualizer key={id} viz={viz} /> : null
}
