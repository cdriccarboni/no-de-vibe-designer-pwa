export class TechSheetGenerator {
  public static generateHTML(projectName: string, dmxNodes: any[], oscNodes: any[]): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Fiche Technique - ${projectName}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background: #eee; }
  </style>
</head>
<body>
  <h1>PATCH RÉGIE — ${projectName}</h1>
  <h2>Adressage DMX</h2>
  <table>
    <tr><th>Univers</th><th>Canal</th><th>Nœud</th></tr>
    ${dmxNodes.map(n => `<tr><td>${n.universe}</td><td>${n.channel}</td><td>${n.label}</td></tr>`).join('')}
  </table>
  <h2>Liaisons OSC</h2>
  <table>
    <tr><th>Port</th><th>Adresse</th><th>Action</th></tr>
    ${oscNodes.map(o => `<tr><td>${o.port}</td><td>${o.address}</td><td>${o.action}</td></tr>`).join('')}
  </table>
</body>
</html>`;
  }
}
