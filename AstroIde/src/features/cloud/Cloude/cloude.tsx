
export default function Contenedores () {
  return (
    <div className="git-panel">
      <div className="git-header">
        <span className="git-title">CONTROL DE CÓDIGO FUENTE</span>
      </div>

      <div className="git-content">
        <div className="git-placeholder">
       
          <p className="git-placeholder-text">
            Inicializa un repositorio o abre una carpeta con git
          </p>
          <button className="git-init-btn">
            Inicializar repisitorio
          </button>
        </div>
      </div>
    </div>
  )
}