export type TeslaConfidence = 'verified' | 'mixed' | 'unknown'

export interface TeslaHardware {
  autopilotComputer: string
  cameras: string
  frontBumperCamera: string
  radar: string
  uss: string
  infotainment: string
  heatPump: string
  ventilatedSeats: string
  rearScreen: string
  stalks: string
}

export interface TeslaGenerationSpec {
  id: string
  label: string
  model: string
  period: string
  origin: string
  factory: string
  vinHint: string
  hardware: TeslaHardware
  battery: string
  fsdKorea: string
  bmsRisk: string
  confidence: string
  sourceUrl?: string
  note?: string
}

export interface TeslaVehicleCard {
  id: string
  year: number
  model: string
  trim: string
  generationId: string
  representativePriceKRW: number | null
  subsidySummary: string
  baseHoguScore: number
  oneLine: string
  scoreReasons: string[]
  confidence: string
  sourceUrl?: string
  note?: string
}

export interface TeslaAnnualRegistration {
  year: number
  model: string
  count: number
  scope: string
  confidence: string
  sourceUrl: string
  note?: string
}

export interface TeslaTrimRegistration {
  period: string
  model: string
  trim: string
  count: number
  parentModelCount?: number
  confidence: string
  sourceUrl: string
  note?: string
}

export interface TeslaVideo {
  id: string
  channel: string
  title: string
  youtubeUrl: string
  embedUrl: string
  tags: string[]
  isDefault: boolean
}

export interface TeslaSource {
  label: string
  url: string
  type: string
}

export interface TeslaData {
  meta: {
    serviceName: string
    version: string
    asOf: string
    scope: string
    dataMode: string
    disclaimer: string
    salesDefinition: string
    trimSalesPolicy: string
  }
  scoreBands: Array<{ min: number; max: number; label: string }>
  scoreWeights: Array<{ key: string; label: string; max: number }>
  generationSpecs: TeslaGenerationSpec[]
  vehicleCards: TeslaVehicleCard[]
  annualModelRegistrations: TeslaAnnualRegistration[]
  knownTrimRegistrations: TeslaTrimRegistration[]
  videos: TeslaVideo[]
  sources: TeslaSource[]
}
