export enum TeamRole {
    Leader = "leader",
    Intelligence = "intelligence",
    Military = "military",
    Diplomat = "diplomat",
    Media = "media"
}

export enum ActionType {
    Offense = "offense",
    Defense = "defense"
}

export interface Action {
    id: number;
    name: string;
    duration: number;
    description: string;
    teamRole: TeamRole;
    type: ActionType;
}

export interface PendingAction {
    user: string; // change this to team
    date: Date;
    action: Action;
}

export interface PendingAction {
    user: string; // change this to team
    date: Date;
    id: number;
}