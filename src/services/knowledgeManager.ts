import fs from 'fs';
import path from 'path';

export interface DocumentChunk {
  id: string;
  sourceFile: string;
  content: string;
  tokensEstimate: number;
}

export class KnowledgeManager {
  private docsDir: string;
  private chunks: DocumentChunk[] = [];

  constructor() {
    this.docsDir = path.resolve(process.cwd(), 'data', 'docs');
    this.reloadDocuments();
  }

  /**
   * Recarga y procesa todos los documentos de texto/markdown en data/docs
   */
  public reloadDocuments(): void {
    this.chunks = [];

    if (!fs.existsSync(this.docsDir)) {
      fs.mkdirSync(this.docsDir, { recursive: true });
    }

    const files = fs.readdirSync(this.docsDir);

    for (const file of files) {
      const fullPath = path.join(this.docsDir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isFile() && (file.endsWith('.txt') || file.endsWith('.md') || file.endsWith('.json'))) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          this.splitAndIndex(file, content);
        } catch (error) {
          console.error(`Error leyendo documento ${file}:`, error);
        }
      }
    }

    console.log(`📚 Base de conocimiento RAG actualizada: ${this.chunks.length} fragmentos cargados desde ${files.length} archivos.`);
  }

  /**
   * Divide un documento en fragmentos (chunks) con solapamiento
   */
  private splitAndIndex(fileName: string, text: string): void {
    // Dividir por párrafos o bloques de texto
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20);

    paragraphs.forEach((p, index) => {
      this.chunks.push({
        id: `${fileName}-chunk-${index}`,
        sourceFile: fileName,
        content: p.trim(),
        tokensEstimate: Math.ceil(p.length / 4)
      });
    });
  }

  /**
   * Búsqueda por relevancia de palabras clave y similitud semántica básica
   */
  public searchRelevantChunks(query: string, maxResults = 3): DocumentChunk[] {
    if (this.chunks.length === 0) return [];

    const queryTerms = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    const scored = this.chunks.map(chunk => {
      const contentLower = chunk.content.toLowerCase();
      let score = 0;

      queryTerms.forEach(term => {
        if (contentLower.includes(term)) {
          score += 10;
        }
      });

      return { chunk, score };
    });

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(item => item.chunk);
  }

  /**
   * Guarda un nuevo documento directamente desde el panel administrativo
   */
  public saveDocument(fileName: string, content: string): void {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(this.docsDir, safeName);
    fs.writeFileSync(filePath, content, 'utf-8');
    this.reloadDocuments();
  }

  /**
   * Lista los documentos actualmente cargados
   */
  public listDocuments(): { name: string; sizeKb: number; chunksCount: number }[] {
    if (!fs.existsSync(this.docsDir)) return [];
    const files = fs.readdirSync(this.docsDir);

    return files.map(file => {
      const fullPath = path.join(this.docsDir, file);
      const stat = fs.statSync(fullPath);
      const chunksCount = this.chunks.filter(c => c.sourceFile === file).length;
      return {
        name: file,
        sizeKb: Math.round((stat.size / 1024) * 10) / 10,
        chunksCount
      };
    });
  }

  /**
   * Elimina un documento
   */
  public deleteDocument(fileName: string): boolean {
    const filePath = path.join(this.docsDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.reloadDocuments();
      return true;
    }
    return false;
  }
}
