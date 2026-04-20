export interface MoveIntent {
  x: number;
  y: number;
}

export const NO_MOVE_INTENT: MoveIntent = Object.freeze({
  x: 0,
  y: 0,
});
