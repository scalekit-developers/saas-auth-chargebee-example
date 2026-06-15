import Link from 'next/link';

type NextStepPanelProps = {
  label: string;
  href: string;
  expectation?: string;
  title?: string;
};

export default function NextStepPanel({
  label,
  href,
  expectation,
  title = 'What to do next',
}: NextStepPanelProps) {
  return (
    <div className="card border-primary">
      <div className="card-body">
        <h2 className="h6 card-title">{title}</h2>
        {expectation && <p className="card-text small text-muted mb-3">{expectation}</p>}
        <Link href={href} className="btn btn-primary">
          {label}
        </Link>
      </div>
    </div>
  );
}