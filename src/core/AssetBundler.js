export class AssetBundler {
  static async exportBundle(projectData, assets = []) {
    const manifest = {
      version: '3.2.0',
      exportedAt: new Date().toISOString(),
      nodeCount: projectData.nodes ? projectData.nodes.length : 0,
      assetCount: assets.length
    };
    return JSON.stringify({ manifest, project: projectData, assets }, null, 2);
  }

  static async importBundle(bundleJsonString) {
    const data = JSON.parse(bundleJsonString);
    if (!data.manifest || !data.project) {
      throw new Error('[AssetBundler] Format de paquet non valide.');
    }
    return data;
  }
}
