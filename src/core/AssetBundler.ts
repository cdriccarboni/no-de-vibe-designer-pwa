import JSZip from 'jszip';

export class AssetBundler {
  public static async buildBundle(
    projectName: string,
    graphJson: string,
    assets: Array<{ path: string; buffer: ArrayBuffer }>
  ): Promise<Blob> {
    const zip = new JSZip();
    const manifest = {
      version: "1.0.0",
      projectName,
      createdAt: new Date().toISOString(),
      assetCount: assets.length
    };

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    zip.file("project.cvd.json", graphJson);

    const assetsFolder = zip.folder("assets");
    for (const asset of assets) {
      assetsFolder?.file(asset.path, asset.buffer);
    }

    return await zip.generateAsync({ type: "blob" });
  }
}
