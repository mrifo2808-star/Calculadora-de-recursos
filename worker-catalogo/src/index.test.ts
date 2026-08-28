import { describe, expect, it } from 'vitest';
import { comoHeaderCookie, construirUrlDescarga, origenPermitido, pareceXlsx } from './index';

describe('construirUrlDescarga', () => {
  it('agrega download=1 a una URL de SharePoint sin tocar el token e=', () => {
    const url = construirUrlDescarga('https://x-my.sharepoint.com/:x:/g/personal/foo/ID123?e=tokenDePrueba');
    expect(url).toContain('download=1');
    expect(url).toContain('e=tokenDePrueba');
  });

  it('reemplaza un download=0 existente en vez de duplicarlo', () => {
    const url = construirUrlDescarga('https://x-my.sharepoint.com/foo?download=0');
    const veces = url.split('download=').length - 1;
    expect(veces).toBe(1);
    expect(url).toContain('download=1');
  });
});

describe('origenPermitido', () => {
  it('permite el origen de GitHub Pages', () => {
    expect(origenPermitido('https://mrifo2808-star.github.io')).toBe(true);
  });

  it('permite los puertos de Vite en localhost (dev/preview)', () => {
    expect(origenPermitido('http://localhost:5173')).toBe(true);
    expect(origenPermitido('http://localhost:4173')).toBe(true);
  });

  it('permite requests sin header Origin (curl, navegacion directa, servidor-a-servidor)', () => {
    expect(origenPermitido(null)).toBe(true);
  });

  it('rechaza un origen que no esta en la lista', () => {
    expect(origenPermitido('https://sitio-cualquiera.com')).toBe(false);
    expect(origenPermitido('https://mrifo2808-star.github.io.evil.com')).toBe(false);
  });
});

describe('pareceXlsx', () => {
  it('acepta bytes que empiezan con la firma de zip "PK"', () => {
    expect(pareceXlsx(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00]))).toBe(true);
  });

  it('rechaza HTML (pagina de error/login de SharePoint) u otro contenido', () => {
    const html = new TextEncoder().encode('<!DOCTYPE html><html>...');
    expect(pareceXlsx(html)).toBe(false);
  });

  it('rechaza bytes vacios o demasiado cortos', () => {
    expect(pareceXlsx(new Uint8Array([]))).toBe(false);
    expect(pareceXlsx(new Uint8Array([0x50, 0x4b]))).toBe(false);
  });
});

describe('comoHeaderCookie', () => {
  it('junta varias Set-Cookie en un header Cookie de "nombre=valor" separados por "; "', () => {
    const headers = new Headers();
    headers.append('Set-Cookie', 'FedAuth=abc123; path=/; secure; HttpOnly');
    headers.append('Set-Cookie', 'rtFa=xyz789; path=/; secure');
    expect(comoHeaderCookie(headers)).toBe('FedAuth=abc123; rtFa=xyz789');
  });

  it('da string vacio si no hay Set-Cookie', () => {
    expect(comoHeaderCookie(new Headers())).toBe('');
  });
});
