const ImageUploader = {
  uploadImage: async function(file) {
    const formData = new FormData();
    formData.append('key', '6d207e02198a847aa98d0a2a901485a5');  // API key de Freeimage.host
    formData.append('action', 'upload');
    formData.append('source', file);
    formData.append('format', 'json');

    try {
      const response = await fetch('https://freeimage.host/api/1/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        const errorMessage = data.error?.message || data.status_txt || 'Error en la subida';
        throw new Error(errorMessage);
      }

      const imageUrl = data.image?.url || data.image?.display_url;
      if (!imageUrl) throw new Error('No se encontró URL de imagen en la respuesta');
      
      return imageUrl;
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      throw new Error(`Error al subir la imagen: ${error.message}`);
    }
  },

  displayUploadedImage: function(imageUrl, previewId) {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.textAlign = 'center';
    container.style.margin = '20px 0';
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Imagen subida';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '400px';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
    img.style.border = '1px solid #eee';
    
    container.appendChild(img);
    preview.appendChild(container);
  },

  showLoading: function(previewId, message = 'Subiendo imagen...') {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    preview.innerHTML = `
      <div class="status-box status-loading">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
  },

  showError: function(previewId, message) {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    preview.innerHTML = `
      <div class="status-box status-error">
        <p>❌ ${message}</p>
      </div>
    `;
  },

  clearPreview: function(previewId) {
    const preview = document.getElementById(previewId);
    if (preview) preview.innerHTML = '';
  }
};
