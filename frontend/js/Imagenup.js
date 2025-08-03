// ImageUploader.js - Módulo optimizado para subir imágenes
const ImageUploader = {
  /**
   * Sube una imagen al servidor usando Freeimage.host API
   * @param {File} file - Archivo de imagen a subir
   * @returns {Promise<string>} URL de la imagen subida
   */
  uploadImage: async function(file) {
    const formData = new FormData();
    formData.append('key', '6d207e02198a847aa98d0a2a901485a5');  // API key pública
    formData.append('action', 'upload');
    formData.append('source', file);
    formData.append('format', 'json');

    try {
      const response = await fetch('https://freeimage.host/api/1/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      // Manejo de errores mejorado
      if (!response.ok || !data.success) {
        const errorMessage = data.error?.message || 
                            data.status_txt || 
                            'Error desconocido en la subida';
        throw new Error(errorMessage);
      }

      // Extracción de URL optimizada
      const imageUrl = data.image?.url || data.image?.display_url;
      if (!imageUrl) throw new Error('No se encontró URL de imagen en la respuesta');
      
      return imageUrl;
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      throw new Error(`Error al subir la imagen: ${error.message}`);
    }
  },

  /**
   * Muestra la imagen subida en un contenedor del DOM
   * @param {string} imageUrl - URL de la imagen subida
   * @param {string} previewId - ID del elemento contenedor
   */
  displayUploadedImage: function(imageUrl, previewId) {
    const preview = document.getElementById(previewId);
    if (!preview) {
      console.warn(`Elemento con ID '${previewId}' no encontrado`);
      return;
    }

    // Limpiar contenido previo
    preview.innerHTML = '';

    // Crear contenedor para la imagen
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.textAlign = 'center';
    container.style.margin = '20px 0';
    
    // Crear elemento de imagen
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Imagen subida';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '400px';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
    img.style.border = '1px solid #eee';
    img.onerror = () => {
      container.innerHTML = '<p>Error cargando la imagen</p>';
    };
    
    container.appendChild(img);
    preview.appendChild(container);
  },

  /**
   * Muestra un estado de carga en el contenedor especificado
   * @param {string} previewId - ID del elemento contenedor
   * @param {string} message - Mensaje a mostrar
   */
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

  /**
   * Muestra un mensaje de error en el contenedor especificado
   * @param {string} previewId - ID del elemento contenedor
   * @param {string} message - Mensaje de error
   */
  showError: function(previewId, message) {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    preview.innerHTML = `
      <div class="image-upload-error">
        <p>❌ ${message}</p>
      </div>
    `;
  },

  /**
   * Limpia el contenedor de vista previa
   * @param {string} previewId - ID del elemento contenedor
   */
  clearPreview: function(previewId) {
    const preview = document.getElementById(previewId);
    if (preview) preview.innerHTML = '';
  }
};

// Asignar al objeto global si se usa en navegador
if (typeof window !== 'undefined') {
  window.ImageUploader = ImageUploader;
}

// Exportar como módulo si se usa en Node.js
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = ImageUploader;
}
