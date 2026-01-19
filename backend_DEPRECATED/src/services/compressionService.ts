import { Request, Response, NextFunction } from 'express';
import zlib from 'zlib';
import { promisify } from 'util';
import logger from '../utils/logger';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * CompressionService: Compressão gzip para reduzir payload
 * - Endpoints com alto volume (location, media)
 * - Threshold: 1KB (payloads pequenos não são beneficiados)
 */

/**
 * Middleware para descomprimir requisições recebidas
 * Se cliente enviar com Content-Encoding: gzip
 */
export const decompressRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Se não há content-encoding, passar adiante
    if (req.headers['content-encoding'] !== 'gzip') {
      return next();
    }

    // Coletar dados comprimidos
    const chunks: Buffer[] = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const decompressed = await gunzip(buffer);

        // Substitui body original com descomprimido
        const bodyStr = decompressed.toString('utf-8');
        req.body = JSON.parse(bodyStr);

        logger.debug(
          `[Compression] Descomprimido ${buffer.length} → ${bodyStr.length} bytes`
        );

        next();
      } catch (error) {
        logger.error(`[Compression] Erro ao descomprimir: ${error}`);
        res.status(400).json({
          success: false,
          error: 'Invalid compressed data',
        });
      }
    });

    req.on('error', (error) => {
      logger.error(`[Compression] Erro ao ler stream: ${error}`);
      res.status(400).json({ success: false, error: 'Request error' });
    });
  } catch (error) {
    logger.error(`[Compression] Middleware error: ${error}`);
    next();
  }
};

/**
 * Função para comprimir resposta
 * Usa automaticamente se payload > 1KB
 */
export const compressResponse = async (
  data: any
): Promise<{ compressed: Buffer; original: number; compressed: number }> => {
  try {
    const json = JSON.stringify(data);
    const originalSize = Buffer.byteLength(json, 'utf-8');

    // Não comprimir se muito pequeno
    if (originalSize < 1024) {
      return {
        compressed: Buffer.from(json),
        original: originalSize,
        compressed: originalSize,
      };
    }

    const compressed = await gzip(json);

    logger.debug(
      `[Compression] Comprimido ${originalSize} → ${compressed.length} bytes ` +
      `(${((1 - compressed.length / originalSize) * 100).toFixed(1)}% reduction)`
    );

    return {
      compressed,
      original: originalSize,
      compressed: compressed.length,
    };
  } catch (error) {
    logger.error(`[Compression] Erro ao comprimir: ${error}`);
    throw error;
  }
};

/**
 * Helper: comprimir antes de responder
 * Se cliente aceita gzip, enviar comprimido
 */
export const sendCompressed = async (
  req: Request,
  res: Response,
  data: any
) => {
  try {
    // Verificar se cliente aceita gzip
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    if (acceptEncoding.includes('gzip')) {
      const { compressed: buffer, original, compressed } = await compressResponse(
        data
      );

      // Headers indicando compressão
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Original-Size', original);
      res.setHeader('X-Compressed-Size', compressed);

      res.send(buffer);
    } else {
      // Client não aceita gzip, enviar JSON normal
      res.setHeader('Content-Type', 'application/json');
      res.json(data);
    }
  } catch (error) {
    logger.error(`[Compression] Erro ao enviar comprimido: ${error}`);
    res.status(500).json({ success: false });
  }
};

/**
 * Response interceptor para endpoints críticos
 * Usado em /location/batch, /services, etc
 */
export const compressedResponseMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Override res.json para comprimir automaticamente
  const originalJson = res.json.bind(res);

  res.json = function (data: any) {
    // Comprimir se payload > 1KB
    const json = JSON.stringify(data);
    if (Buffer.byteLength(json, 'utf-8') > 1024) {
      sendCompressed(req, res, data).catch(() => {
        originalJson(data);
      });
    } else {
      originalJson(data);
    }
    return res;
  };

  next();
};

/**
 * Função para serializar com compressão no Flutter
 * Usar quando enviando location batches
 * 
 * Exemplo Flutter:
 * ```dart
 * final locations = [...];
 * final json = jsonEncode({'locations': locations});
 * final bytes = utf8.encode(json);
 * final compressed = gzip.encode(bytes);
 * 
 * await http.post(
 *   Uri.parse('$apiUrl/location/batch-compressed'),
 *   headers: {
 *     'Content-Encoding': 'gzip',
 *     'Content-Type': 'application/json',
 *   },
 *   body: compressed,
 * );
 * ```
 */

/**
 * Estadísticas de compressão
 */
class CompressionStats {
  private stats = {
    total_requests: 0,
    compressed_requests: 0,
    total_original_bytes: 0,
    total_compressed_bytes: 0,
  };

  addCompression(original: number, compressed: number) {
    this.stats.total_requests++;
    if (compressed < original) {
      this.stats.compressed_requests++;
    }
    this.stats.total_original_bytes += original;
    this.stats.total_compressed_bytes += compressed;
  }

  getStats() {
    const reduction =
      (
        (1 -
          this.stats.total_compressed_bytes /
            this.stats.total_original_bytes) *
        100
      ).toFixed(1) + '%';

    return {
      ...this.stats,
      reduction,
      efficiency:
        this.stats.compressed_requests / this.stats.total_requests,
    };
  }

  reset() {
    this.stats = {
      total_requests: 0,
      compressed_requests: 0,
      total_original_bytes: 0,
      total_compressed_bytes: 0,
    };
  }
}

export const compressionStats = new CompressionStats();
