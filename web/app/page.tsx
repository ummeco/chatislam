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

      {/* Sticky footer — AI disclaimer + legal links (T09-LEGAL-COUNSEL-PACK) */}
      <footer
        style={{
          position:    "fixed",
          bottom:      0,
          left:        0,
          right:       0,
          background:  "rgba(13, 47, 23, 0.9)",
          borderTop:   "1px solid rgba(45, 90, 53, 0.5)",
        }}
      >
        {/* SCI-11: AI disclaimer */}
        <p
          role="note"
          aria-label="AI disclaimer"
          style={{
            padding:   "0.5rem 1rem 0.25rem",
            fontSize:  "0.7rem",
            color:     "rgba(201, 242, 122, 0.6)",
            textAlign: "center",
          }}
        >
          AI-generated content only. Not a fatwa. Consult a qualified Islamic scholar for
          personal religious decisions.
        </p>
        {/* T09-LEGAL-COUNSEL-PACK: Legal links — Privacy · Terms · Cookies · AUP */}
        <nav
          aria-label="Legal links"
          style={{
            display:        "flex",
            flexWrap:       "wrap",
            justifyContent: "center",
            gap:            "0 1rem",
            padding:        "0 1rem 0.5rem",
            fontSize:       "0.65rem",
          }}
        >
          {[
            ["Privacy Policy",  "/privacy"],
            ["Terms",           "/terms"],
            ["Cookies",         "/cookies"],
            ["Acceptable Use",  "/aup"],
            ["Open Source",     "/legal/attribution"],
            ["Sharia Disclaimer", "/legal/sharia-disclaimer"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              style={{ color: "rgba(201, 242, 122, 0.45)", textDecoration: "none" }}
            >
              {label}
            </a>
          ))}
        </nav>
      </footer>
    </main>
  );
}
