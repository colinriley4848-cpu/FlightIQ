export default function BuyWaitWidget({ results }) {
  if (!results?.buy_wait_decision) return null;

  const { decision, confidence_score, reasoning } = results.buy_wait_decision;
  const isBuy = decision === "BUY NOW";

  return (
    <div className={`buy-wait-widget ${isBuy ? "buy" : "wait"}`}>
      <div className="bw-header">
        <span className="bw-icon">{isBuy ? "🟢" : "🟡"}</span>
        <span className="bw-decision">{decision}</span>
        <span className="bw-score">Confidence: {confidence_score}/100</span>
      </div>
      <ul className="bw-reasons">
        {reasoning?.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    </div>
  );
}