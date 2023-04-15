#let conf(
  title: none,
  authors: (),
  abstract: [],
  doc,
) = {
  set page(
    paper: "us-letter",
    header: align(
      right + horizon,
      text(font: "Iosevka Etoile Iaso", size: 9pt)[#title]
    ),
  )
  set par(justify: true)
  set text(
    font: "Iosevka Aile Iaso",
    size: 9.8pt,
  )

  set align(center)
  text(font: "Iosevka Etoile Iaso", size: 17pt)[#title]

  let count = authors.len()
  let ncols = calc.min(count, 6)
  grid(
    columns: (1fr,) * ncols,
    row-gutter: 24pt,
    ..authors.map(author => text(font: "Iosevka Aile Iaso", size: 9pt)[
      #author.name \
      #author.affiliation \
      #link("mailto:" + author.email)
    ]),
  )

  par(justify: false)[
    #text(font: "Iosevka Etoile Iaso", size: 11pt)[*Abstract*] \
    #abstract
  ]

  set align(left)
  columns(2, doc)
}
