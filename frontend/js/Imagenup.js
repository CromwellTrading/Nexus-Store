// Imagenup.js - Módulo mejorado para subir imágenes a Imagebin.ca
const ImageUploader = {
  uploadImageToImageBin: async function(file) {
    const formData = new FormData();
    formData.append('key', 'oQJs9Glzy1gzHGvYSc1M0N8AzPQ7oKRe');
    formData.append('file', file);

    try {
      // Usar proxy para evitar problemas de CORS
      const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
      const targetUrl = 'https://imagebin.ca/upload.php';
      
      const response = await fetch(proxyUrl + targetUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error(`Error en respuesta: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      console.log('Respuesta de Imagebin:', text);
      
      // Extraer la URL usando expresión regular mejorada
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
          // Tomar la última URL (generalmente es la del archivo)
          const imageUrl = urls[urls.length - 1];
          console.log('URL de imagen obtenida (fallback):', imageUrl);
          return imageUrl;
        } else {
          throw new Error('No se encontró la URL en la respuesta de Imagebin');
        }
      }
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      throw new Error(`Error al subir la imagen: ${error.message}`);
    }
  },

  previewUploadedImage: function(imageUrl, previewId) {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Imagen subida';
    img.style.maxWidth = '100px';
    img.style.maxHeight = '100px';
    img.style.objectFit = 'contain';
    img.style.margin = '5px';
    img.style.border = '1px solid #ddd';
    img.style.borderRadius = '4px';
    preview.appendChild(img);
  },

  showLoading: function(previewId, message = 'Subiendo imagen...') {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    preview.innerHTML = `
      <div class="image-upload-status">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
  },

  showError: function(previewId, message) {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    preview.innerHTML = `
      <div class="image-upload-error">
        <p>❌ ${message}</p>
      </div>
    `;
  },

  resetPreview: function(previewId) {
    const preview = document.getElementById(previewId);
    if (preview) {
      preview.innerHTML = '';
    }
  }
};

window.ImageUploader = ImageUploader;
