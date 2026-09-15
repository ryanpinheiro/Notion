export class DataProvider {
  static async get(name) {
    const response = await fetch(`assets/data/${name}.json`);
    if (!response.ok) throw new Error(`Falha ao carregar ${name}`);
    return response.json();
  }
}
