export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "2.5rem",
          fontWeight: 700,
          marginBottom: "1rem",
          color: "#C9F27A",
        }}
      >
        ChatIslam
      </h1>
      <p
        style={{
          fontSize: "1.125rem",
          marginBottom: "0.5rem",
          color: "rgba(201, 242, 122, 0.8)",
        }}
      >
        AI-assisted Islamic Q&amp;A. Beta launching soon.
      </p>
      <p style={{ marginTop: "1.5rem" }}>
        <a
          href="https://chatislam.org"
          style={{ color: "#79C24C", textDecoration: "underline" }}
        >
          chatislam.org
        </a>
      </p>
    </main>
  );
}
