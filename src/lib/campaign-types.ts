export type UserRole = 'ADMIN' | 'TEAM_LEAD' | 'STAFF'

export interface CampaignWork {
  id:            string
  hourEntryId:   string
  name:          string
  count:         number
  createdByRole: UserRole
  updatedAt:     string
}

export interface HourEntry {
  id:        string
  staffId:   string
  shiftKey:  string
  hourStart: string
  hourEnd:   string
  campaigns: CampaignWork[]
}

export interface HourEntryWithMeta extends HourEntry {
  staffName:  string
  team:       'DAY' | 'NIGHT'
  totalCount: number
}

export interface CampaignBreakdown {
  name:  string
  count: number
}

export interface StaffCampaignReport {
  staffId:           string
  staffName:         string
  team:              'DAY' | 'NIGHT'
  totalCampaigns:    number
  campaignBreakdown: CampaignBreakdown[]
  hourEntries:       HourEntryWithMeta[]
}
