export class TechSheetGenerator {
  static generateHtml(project) {
    const nodes = project.nodes || [];
    return `<!DOCTYPE html>
<html>
<head><title>Fiche Technique - ${project.title || 'No[co]de Vibe'}</title></head>
<body style="font-family:sans-serif; background:#090d16; color:#fff; padding:20px;">
  <h1>Fiche Technique Régie v3.2.0</h1>
  <p>Nombre de Nœuds : ${nodes.length}</p>
  <ul>${nodes.map(n => `<li>${n.type || n.id}</li>`).join('')}</ul>
</body>
</html>`;
  }

  static async exportPdf(windowInstance, project) {
    if (windowInstance && windowInstance.webContents && typeof windowInstance.webContents.printToPDF === 'function') {
      return await windowInstance.webContents.printToPDF({});
    }
    window.print();
    return null;
  }
}
