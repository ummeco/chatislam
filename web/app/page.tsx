/**
 * SCI-11 — AI-is-not-a-fatwa disclaimer added below hero subtext.
 * Static footer disclaimer requires no JS — always visible.
 */
export default function Home() {
  return (
    <main
      style={{
        minHeight:      "100vh",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "2rem",
        textAlign:      "center",
      }}
    >
      <h1
        style={{
          fontSize:     "2.5rem",
          fontWeight:   700,
          marginBottom: "1rem",
          color:        "#C9F27A",
        }}
      >
        ChatIslam
      </h1>
      <p
        style={{
          fontSize:     "1.125rem",
          marginBottom: "0.25rem",
          color:        "rgba(201, 242, 122, 0.8)",
        }}
      >
        AI-assisted Islamic Q&amp;A. Beta launching soon.
      </p>

      {/* SCI-11 — fatwa disclaimer below hero subtext */}
      <p
        style={{
          fontSize:     "0.8rem",
          color:        "rgba(201, 242, 122, 0.5)",
          marginBottom: "1.5rem",
          maxWidth:     "36rem",
          lineHeight:   "1.5",
        }}
      >
        Responses are AI-generated for informational purposes only and are not fatwas or
        authoritative religious rulings. Always consult a qualified Islamic scholar for
        personal religious guidance.
      </p>

      <p style={{ marginTop: "0.5rem" }}>
        <a
          href="https://chatislam.org"
          style={{ color: "#79C24C", textDecoration: "underline" }}
        >
          chatislam.org
        </a>
      </p>

      {/* Sticky footer disclaimer — no JS required (SCI-11) */}
      <footer
        role="note"
        aria-label="AI disclaimer"
        style={{
          position:    "fixed",
          bottom:      0,
          left:        0,
          right:       0,
          padding:     "0.5rem 1rem",
          fontSize:    "0.7rem",
          color:       "rgba(201, 242, 122, 0.6)",   /* WCAG AA: 5.27:1 at 0.6 alpha on #0D2F17-90% bg */
          textAlign:   "center",
          background:  "rgba(13, 47, 23, 0.9)",
          borderTop:   "1px solid rgba(45, 90, 53, 0.5)",
        }}
      >
        AI-generated content only. Not a fatwa. Consult a qualified Islamic scholar for
        personal religious decisions.
      </footer>
    </main>
  );
}
