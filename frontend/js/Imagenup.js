// Imagenup.js - Módulo mejorado para subir imágenes a Imagebin.ca
const ImageUploader = {
  uploadImageToImageBin: async function(file) {
    const formData = new FormData();
    formData.append('key', 'oQJs9Glzy1gzHGvYSc1M0N8AzPQ7oKRe');
    formData.append('file', file);

    try {
      console.log('Iniciando subida de imagen a Imagebin.ca...');
      
      const response = await fetch('https://imagebin.ca/upload.php', {
        method: 'POST',
        body: formData,
        // Añadir headers para mejorar compatibilidad
        headers: {
          'Accept': 'text/plain'
        }
      });

      console.log('Respuesta recibida de Imagebin.ca');
      
      if (!response.ok) {
        throw new Error(`Error en respuesta: ${response.status} ${response.statusText}`);
      }
      
      const text = await response.text();
      console.log('Respuesta de Imagebin:', text);
      
      // Búsqueda mejorada de URL
      const urlMatch = text.match(/url:\s*(https?:\/\/[^\s]+)/i);
      
      if (urlMatch && urlMatch[1]) {
        const imageUrl = urlMatch[1].trim();
        console.log('URL de imagen obtenida:', imageUrl);
        return imageUrl;
      } else {
        // Intentar encontrar cualquier URL en la respuesta
        const urlRegex = /https?:\/\/[^\s]+/g;
        const urls = text.match(urlRegex);
        
        if (urls && urls.length > 0) {
          const imageUrl = urls[urls.length - 1];
          console.log('URL de imagen obtenida (fallback):', imageUrl);
          return imageUrl;
        } else {
          throw new Error('No se encontró URL en la respuesta de Imagebin');
        }
      }
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      
      // Mensaje de error más descriptivo
      let errorMessage = 'Error de conexión';
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Error de red: No se pudo conectar con el servidor de imágenes';
      } else if (error.message.includes('NetworkError')) {
        errorMessage = 'Error de red: Verifica tu conexión a internet';
      }
      
      throw new Error(`${errorMessage}: ${error.message}`);
    }
  },

  // Resto de funciones permanecen igual...
};

window.ImageUploader = ImageUploader;
