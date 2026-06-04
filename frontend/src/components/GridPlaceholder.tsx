interface Props {
  slotIndex: number;
}

export function GridPlaceholder({ slotIndex }: Props) {
  return (
    <div className="cell cell--empty">
      <div className="cell__header">
        <span className="cell__title">Slot {slotIndex + 1}</span>
        <span className="badge badge--empty">empty</span>
      </div>
      <div className="cell__video cell__video--placeholder">
        <span>No camera</span>
      </div>
      <div className="cell__footer">
        <span>Add a camera with grid slot {slotIndex}</span>
      </div>
    </div>
  );
}
