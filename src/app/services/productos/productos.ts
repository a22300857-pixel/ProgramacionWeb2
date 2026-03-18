import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';
import { Product } from '../../models/producto/producto';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private cachedProducts: Product[] | null = null;

  getAll(): Observable<Product[]> {
    // Si ya tenemos productos en caché, retornarlos
    if (this.cachedProducts) {
      return of(this.cachedProducts);
    }

    // En SSR, retornar array vacío inmediatamente
    if (!isPlatformBrowser(this.platformId)) {
      return of([]);
    }

    return this.http.get('/productos.xml', { responseType: 'text' }).pipe(
      map((xmlText) => {
        const products = this.parseProductsXml(xmlText);
        this.cachedProducts = products;
        return products;
      })
    );
  }


  private parseProductsXml(xmlText: string): Product[] {
    // Verificar si estamos en el navegador antes de usar DOMParser
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('DOMParser no disponible en entorno SSR');
      return [];
    }

    try {
      // Verificar si DOMParser existe
      if (typeof DOMParser === 'undefined') {
        console.warn('DOMParser no definido');
        return [];
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'application/xml');

      // Si el XML está mal formado, normalmente aparece <parsererror>
      if (doc.getElementsByTagName('parsererror').length > 0) {
        return [];
      }

      const nodes = Array.from(doc.getElementsByTagName('product'));

      return nodes.map((node) => ({
        id: this.getNumber(node, 'id'),
        name: this.getText(node, 'name'),
        price: this.getNumber(node, 'price'),
        imageUrl: this.getText(node, 'imageUrl'),
        category: this.getText(node, 'category'),
        description: this.getText(node, 'description'),
        inStock: this.getBoolean(node, 'inStock'),
      }));
    } catch (error) {
      console.error('Error parsing XML:', error);
      return [];
    }
  }

  private getText(parent: Element, tag: string): string {
   return parent.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
 }

  private getNumber(parent: Element, tag: string): number {
    const value = this.getText(parent, tag);
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private getBoolean(parent: Element, tag: string): boolean {
    const value = this.getText(parent, tag).toLowerCase();
    return value === 'true' || value === '1' || value === 'yes';
  }
}


