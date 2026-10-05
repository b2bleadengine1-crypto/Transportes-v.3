export interface Vehicle {
  id: string;
  agency_id?: string | null;
  bearing?: number | null;
  bikes_allowed?: boolean | null;
  block_id?: string | null;
  capacity_seated?: number | null;
  capacity_standing?: number | null;
  capacity_total?: number | null;
  contactless?: boolean | null;
  current_status?: string | null; // e.g. "IN_TRANSIT_TO", "STOPPED_AT", "INCOMING_AT"
  direction_id?: number | null;
  door_status?: string | null;
  emission_class?: string | null;
  event_id?: string | null;
  lat: number;
  license_plate?: string | null;
  line_id: string;
  lon: number;
  make?: string | null;
  model?: string | null;
  occupancy_estimated?: number | null;
  occupancy_status?: string | null;
  owner?: string | null;
  pattern_id?: string | null;
  propulsion?: string | null;
  registration_date?: string | null;
  route_id?: string | null;
  schedule_relationship?: string | null;
  shift_id?: string | null;
  speed?: number | null;
  stop_id?: string | null;
  timestamp?: number | null;
  trip_id?: string | null;
  wheelchair_accessible?: boolean | null;
  delayMinutes?: number | null;
}

export interface Line {
  id: string;
  short_name: string;
  long_name: string;
  color: string;
  text_color: string;
  district_ids?: string[];
  facilities?: string[];
  locality_ids?: string[];
  municipality_ids?: string[];
  pattern_ids?: string[];
  region_ids?: string[];
  route_ids?: string[];
  stop_ids?: string[];
  tts_name?: string;
}

export type AreaFilter = 'all' | '1' | '2' | '3' | '4';
export type MotionFilter = 'all' | 'moving' | 'stopped';
export type MapTileStyle = 'carto-dark' | 'carto-light' | 'carto-voyager' | 'osm' | 'satellite';

export interface MapLayersConfig {
  showBuses?: boolean;
  showStops: boolean;
  showRouteLines: boolean;
  showTrafficHeatmap: boolean;
  showMetro?: boolean;
  showFertagus?: boolean;
  showMobiCascais?: boolean;
  showCp?: boolean;
  showBoats?: boolean;
  showMST?: boolean;
}

export interface CardValidationsData {
  _41_today_valid_count: number;
  _41_last_week_valid_count: number;
  _42_today_valid_count: number;
  _42_last_week_valid_count: number;
  _43_today_valid_count: number;
  _43_last_week_valid_count: number;
  _44_today_valid_count: number;
  _44_last_week_valid_count: number;
  _cm_today_valid_count: number;
  _cm_last_week_valid_count: number;
  timestamp?: number;
}

export interface StopInfo {
  id: string;
  name: string;
  lat: number;
  lon: number;
  locality?: string;
  locality_name?: string | null;
  municipality_id?: string;
  municipality_name?: string | null;
  line_ids?: string[];
  lines?: string[];
  pattern_ids?: string[];
  route_ids?: string[];
  tts_name?: string;
}

export interface StopArrivalItem {
  lineId: string;
  headsign: string;
  scheduledArrival: string | null;
  scheduledArrivalUnix: number | null;
  estimatedArrival: string | null;
  estimatedArrivalUnix: number | null;
  minutesAway: number | null;
  delayMinutes: number | null;
  isRealtime: boolean;
  vehicleId?: string | null;
  tripId?: string | null;
  patternId?: string | null;
  stopSequence?: number | null;
}

export interface EstimatedStopArrival {
  stopId: string;
  stopName: string;
  stopSequence?: number;
  estimatedArrival?: string | null;
  estimatedArrivalUnix?: number | null;
  scheduledArrival?: string | null;
  scheduledArrivalUnix?: number | null;
  minutesAway?: number | null;
  delayMinutes?: number | null;
  isRealtime: boolean;
  distanceMeters?: number;
}

export interface AreaInfo {
  id: AreaFilter;
  name: string;
  subtitle: string;
  municipalities: string[];
  color: string;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertCause = 'STRIKE' | 'DETOUR' | 'MAINTENANCE' | 'ACCIDENT' | 'WEATHER' | 'OTHER_CAUSE';
export type AlertEffect = 'NO_SERVICE' | 'REDUCED_SERVICE' | 'SIGNIFICANT_DELAYS' | 'DETOUR' | 'ADDITIONAL_SERVICE' | 'MODIFIED_SERVICE' | 'OTHER_EFFECT';

export interface UserLocation {
  lat: number;
  lon: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
}

export interface ServiceAlert {
  id: string;
  cause: string;
  effect: string;
  header: string;
  description: string;
  affectedLines: string[];
  timestamp: number;
  title: string;
  lines: string[];
  severity: AlertSeverity;
  headerText?: string;
  activePeriod?: {
    start?: string | number;
    end?: string | number;
  };
  url?: string;
  updatedAt?: number;
}

