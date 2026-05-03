type Props = {
  label: string;
};

export function ShareWatermark({ label }: Props) {
  const marks = Array.from({ length: 14 }, (_, index) => index);
  return (
    <div className="share-watermark" aria-hidden="true">
      {marks.map((index) => (
        <span key={index}>{label}</span>
      ))}
    </div>
  );
}
