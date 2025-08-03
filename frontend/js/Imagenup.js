// ImageUploader.js - Módulo optimizado para ImageKit
const ImageUploader = {
  // Configuración de ImageKit
  publicKey: 'public_hhFA4QLrpbIf5aVDBZfodu08iOA=',
  privateKey: 'private_r3YLluiuLrO43qZaewT9yBzXgTI=',
  urlEndpoint: 'https://ik.imagekit.io/tzsnnmyff',
  
  // Generar autenticación para ImageKit
  generateAuthParams: function() {
    const expire = Math.floor(Date.now() / 1000) + 600; // 10 minutos de validez
    const signature = this.generateSignature(expire);
    return `?key=${this.publicKey}&expire=${expire}&signature=${signature}`;
  },
  
  // Generar firma HMAC-SHA1 corregida
  generateSignature: function(expire) {
    try {
      const message = expire + this.privateKey;
      const hash = CryptoJS.HmacSHA1(message, this.privateKey);
      return CryptoJS.enc.Hex.stringify(hash); // Formato hexadecimal
    } catch (error) {
      console.error('Error generando firma:', error);
      throw new Error('Error de configuración de seguridad: ' + error.message);
    }
  },
  
  // Subir imagen a ImageKit
  uploadImage: async function(file) {
    // Validar tipo y tamaño de archivo
    this.validateImage(file);
    
    const authParams = this.generateAuthParams();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name || `image_${Date.now()}`);
    formData.append('useUniqueFileName', 'true');
    
    try {
      const response = await fetch(`${this.urlEndpoint}/upload${authParams}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (response.status !== 200) {
        const errorMessage = data.message || 
                            data.error || 
                            `Error ${response.status} en la subida`;
        throw new Error(errorMessage);
      }
      
      return data.url; // URL de la imagen subida
    } catch (error) {
      console.error('Error subiendo imagen:', {
        error: error.message,
        fileName: file.name,
        fileType: file.type,
        fileSize: `${(file.size / 1024).toFixed(2)} KB`
      });
      
      throw new Error(`Error al subir la imagen: ${error.message}`);
    }
  },
  
  // Validar imagen antes de subir
  validateImage: function(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 15 * 1024 * 1024; // 15MB
    
    if (!validTypes.includes(file.type)) {
      throw new Error(`Formato no soportado: ${file.type}. Use JPG, PNG, WEBP o GIF`);
    }
    
    if (file.size > maxSize) {
      throw new Error(`Tamaño excesivo (${(file.size/1024/1024).toFixed(2)}MB). Máximo: 15MB`);
    }
  },
  
  // Mostrar imagen subida
  displayUploadedImage: function(imageUrl, previewId) {
    const preview = document.getElementById(previewId);
    if (!preview) {
      console.warn('Elemento de preview no encontrado');
      return;
    }

    preview.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'image-preview-container';
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Imagen subida';
    img.className = 'uploaded-image-preview';
    
    // Optimización de ImageKit
    const optimizedUrl = `${imageUrl}?tr=w-400,h-300,c-at_max`; 
    img.src = optimizedUrl;
    
    container.appendChild(img);
    preview.appendChild(container);
  },

  // Mostrar estado de carga
  showLoading: function(previewId, message = 'Subiendo imagen...') {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    preview.innerHTML = `
      <div class="upload-loading">
        <div class="upload-spinner"></div>
        <p>${message}</p>
      </div>
      <style>
        .upload-loading {
          padding: 20px;
          text-align: center;
          background: #f8f9fa;
          border-radius: 8px;
          color: #0d47a1;
        }
        .upload-spinner {
          border: 4px solid rgba(0,0,0,0.1);
          border-top: 4px solid #2575fc;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 15px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
  },

  // Mostrar error
  showError: function(previewId, message) {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    preview.innerHTML = `
      <div class="upload-error">
        <p>❌ ${message}</p>
      </div>
      <style>
        .upload-error {
          padding: 15px;
          text-align: center;
          background: #ffebee;
          border-radius: 8px;
          color: #b71c1c;
          margin: 10px 0;
        }
      </style>
    `;
  },

  // Limpiar vista previa
  clearPreview: function(previewId) {
    const preview = document.getElementById(previewId);
    if (preview) preview.innerHTML = '';
  }
};

// Cargar CryptoJS si no está disponible
if (typeof CryptoJS === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
  script.integrity = 'sha512-E8QSvWZ0eCLGk4km3hxSsNmGWbLtSCSUcewDQPQWZF6pEU8GlT8a5fFv4FbVimqHRQ9fd6p0CqigcG/Xluhw==';
  script.crossOrigin = 'anonymous';
  script.onload = () => console.log('CryptoJS cargado para ImageUploader');
  document.head.appendChild(script);
}

// Solo expone al global si está en navegador
if (typeof window !== 'undefined') {
  window.ImageUploader = ImageUploader;
}
