type Props = {
  eyebrow?: string
  title: string
  titleAccent?: string
  lead?: string
}

export function VendedorPageHeader({ eyebrow, title, titleAccent, lead }: Props) {
  return (
    <header className="max-w-3xl">
      {eyebrow ? <p className="mc-landing-eyebrow">{eyebrow}</p> : null}
      <h1 className="mc-landing-title">
        {title}
        {titleAccent ? <span className="mc-landing-title__accent">{titleAccent}</span> : null}
      </h1>
      {lead ? <p className="mc-landing-lead">{lead}</p> : null}
    </header>
  )
}
