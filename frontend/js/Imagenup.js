// Imagenup.js - Módulo para subir imágenes a ImgBB
const ImageUploader = {
  uploadImage: async function(file) {
    const formData = new FormData();
    formData.append('key', 'f0f757f1c4af7bdb6aea6fa59bd1d718');  // API key de ImgBB
    formData.append('image', file);

    try {
      const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Error en respuesta: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Respuesta de ImgBB:', data);
      
      // Extraemos la URL directa de la respuesta JSON
      if (data && data.data && data.data.url) {
        const imageUrl = data.data.url;
        console.log('URL de imagen obtenida:', imageUrl);
        return imageUrl;
      } else if (data && data.data && data.data.image && data.data.image.url) {
        const imageUrl = data.data.image.url;
        console.log('URL de imagen obtenida (alternativa):', imageUrl);
        return imageUrl;
      } else {
        throw new Error('No se encontró la URL en la respuesta de ImgBB');
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
