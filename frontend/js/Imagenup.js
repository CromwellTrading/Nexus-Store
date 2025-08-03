// Imagenup.js - Módulo para subir imágenes a Freeimage.host
const ImageUploader = {
  uploadImage: async function(file) {
    const formData = new FormData();
    formData.append('key', '6d207e02198a847aa98d0a2a901485a5');  // API key de Freeimage.host
    formData.append('action', 'upload');
    formData.append('source', file);  // Campo modificado a 'source'
    formData.append('format', 'json'); // Asegurar formato de respuesta JSON

    try {
      const response = await fetch('https://freeimage.host/api/1/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error en la subida');
      }

      const data = await response.json();
      console.log('Respuesta de Freeimage.host:', data);
      
      // Extraemos la URL directa de la respuesta JSON
      if (data && data.image && data.image.url) {
        const imageUrl = data.image.url;
        console.log('URL de imagen obtenida:', imageUrl);
        return imageUrl;
      } else if (data && data.image && data.image.display_url) {
        // En caso de que la estructura sea ligeramente diferente
        const imageUrl = data.image.display_url;
        console.log('URL de imagen obtenida (display_url):', imageUrl);
        return imageUrl;
      } else {
        throw new Error('No se encontró la URL en la respuesta de Freeimage.host');
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
