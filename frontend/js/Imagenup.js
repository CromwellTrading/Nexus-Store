// Imagenup.js - Módulo para subir imágenes a Imagebin.ca
const ImageUploader = {
  uploadImageToImageBin: async function(file) {
    const formData = new FormData();
    formData.append('key', 'oQJs9Glzy1gzHGvYSc1M0N8AzPQ7oKRe');
    formData.append('file', file);

    try {
      const response = await fetch('https://imagebin.ca/upload.php', {
        method: 'POST',
        body: formData
      });

      const text = await response.text();
      console.log('Respuesta de Imagebin:', text);
      
      // Buscar la línea que contiene 'url:' con expresiones regulares mejoradas
      const urlRegex = /https?:\/\/[^\s]+/g;
      const urls = text.match(urlRegex);
      
      if (urls && urls.length > 0) {
        // Tomamos la última URL que generalmente es la del archivo
        const imageUrl = urls[urls.length - 1];
        console.log('URL de imagen obtenida:', imageUrl);
        return imageUrl;
      } else {
        throw new Error('No se encontró la URL en la respuesta de Imagebin');
      }
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      throw error;
    }
  },

  // Función para mostrar previsualización de la imagen subida (desde URL)
  previewUploadedImage: function(imageUrl, previewId) {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Imagen subida a Imagebin.ca';
    img.style.maxWidth = '100px';
    img.style.maxHeight = '100px';
    img.style.objectFit = 'contain';
    img.style.margin = '5px';
    img.style.border = '1px solid #ddd';
    img.style.borderRadius = '4px';
    preview.appendChild(img);
  },

  // Función para mostrar estado de carga
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

  // Función para mostrar error
  showError: function(previewId, message) {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    preview.innerHTML = `
      <div class="image-upload-error">
        <p>❌ ${message}</p>
      </div>
    `;
  },

  // Función para resetear la previsualización
  resetPreview: function(previewId) {
    const preview = document.getElementById(previewId);
    if (preview) {
      preview.innerHTML = '';
    }
  }
};

// Hacerlo accesible globalmente
window.ImageUploader = ImageUploader;
