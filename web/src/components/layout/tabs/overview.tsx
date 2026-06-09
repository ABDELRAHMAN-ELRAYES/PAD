export default function Overview() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">System Design Overview</h2>
        <p className="text-muted-foreground mb-4">
          Your AI-generated comprehensive Software Development Life Cycle (SDLC) documentation is ready. Click through
          the tabs to explore detailed requirements, architecture diagrams, testing strategies, and more.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          {
            icon: "📋",
            title: "Requirements",
            description: "User stories and acceptance criteria",
          },
          {
            icon: "🏗️",
            title: "Architecture",
            description: "System design and components",
          },
          {
            icon: "📊",
            title: "Diagrams",
            description: "Visual representations with Mermaid",
          },
          {
            icon: "✅",
            title: "Test Plan",
            description: "QA strategy and test cases",
          },
        ].map((item) => (
          <div key={item.title} className="pad-content-block">
            <div className="text-3xl mb-2">{item.icon}</div>
            <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="p-6 bg-secondary/10 border border-accent/20 rounded-xl">
        <div className="flex gap-3 items-start">
          <span className="text-2xl">✨</span>
          <div>
            <h3 className="font-semibold text-foreground mb-1">AI Generated</h3>
            <p className="text-sm text-muted-foreground">
              All content is AI-generated and ready to edit. Click any section to customize it to your needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
