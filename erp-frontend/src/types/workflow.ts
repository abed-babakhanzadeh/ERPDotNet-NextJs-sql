export interface ProcessDto {
  id: number;
  processCode: string;
  title: string;
  targetEntityName: string;
  isActive: boolean;
  activeVersionId: number;
  activeVersionNumber: number;
}

export interface StateDto {
  id: number;
  title: string;
  stateCode: string;
  type: number; // 1: Start, 2: Intermediate, 3: End
}

export interface TransitionDto {
  id: number;
  fromStateId: number;
  fromStateTitle: string;
  toStateId: number;
  toStateTitle: string;
  actionTitle: string;
  actionCode?: string;
  isActive: boolean;
}

export interface ProcessDetailsDto extends ProcessDto {
  states: StateDto[];
  transitions: TransitionDto[];
}
