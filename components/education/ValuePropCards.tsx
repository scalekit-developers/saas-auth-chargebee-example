import { VALUE_PROPS } from '@/lib/demo/guide-content';

export default function ValuePropCards() {
  return (
    <div className="row g-3">
      {VALUE_PROPS.map((prop) => (
        <div className="col-md-6" key={prop.title}>
          <div className="card h-100">
            <div className="card-body">
              <h3 className="h5 card-title">{prop.title}</h3>
              <p className="text-muted small">{prop.subtitle}</p>
              <ul className="small mb-0">
                {prop.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}