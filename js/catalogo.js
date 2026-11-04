const POR_PAGINA = 24;
let paginaActual = 0;
let totalProductos = 0;
let categoriaSeleccionada = "Todos";
let modeloSeleccionado = "Todos";
let textoBusqueda = "";
let temporizadorBusqueda;

const contenedorProductos = document.getElementById("productos");
const estadoCatalogo = document.getElementById("estado-catalogo");
const contenedorCategorias = document.getElementById("categorias");
const contenedorPaginacion = document.getElementById("paginacion");

function urlFoto(ruta) {
  return db.storage.from("productos").getPublicUrl(ruta).data.publicUrl;
}

async function cargarCategorias() {
  const { data, error } = await db.from("productos")
    .select("categoria").not("categoria", "is", null).limit(1000);
  if (error) {
    console.error("No se pudieron cargar las categorías:", error);
    return;
  }
  const categorias = ["Todos", ...new Set(data.map(x => x.categoria).filter(Boolean).sort())];
  contenedorCategorias.replaceChildren();
  categorias.forEach(cat => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = cat;
    boton.classList.toggle("activa", cat === categoriaSeleccionada);
    boton.addEventListener("click", async () => {
      categoriaSeleccionada = cat;
      modeloSeleccionado = "Todos";
      paginaActual = 0;
      await cargarModelos();
      cargarProductos();
      marcarCategoriaActiva();
    });
    contenedorCategorias.appendChild(boton);
  });
}

async function cargarModelos() {
  const caja = document.getElementById("modelos-contenedor");
  const lista = document.getElementById("modelos");
  lista.replaceChildren();
  if (categoriaSeleccionada === "Todos") {
    caja.hidden = true;
    return;
  }
  const { data, error } = await db.from("productos").select("modelo")
    .eq("categoria", categoriaSeleccionada).not("modelo", "is", null).limit(1000);
  if (error) { console.error("No se pudieron cargar los modelos:", error); caja.hidden = true; return; }
  const modelos = ["Todos", ...new Set((data || []).map(x => x.modelo).filter(Boolean).sort((a,b) => a.localeCompare(b, "es")))];
  caja.hidden = modelos.length <= 1;
  modelos.forEach(modelo => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = modelo === "Todos" ? "Todos los modelos" : modelo;
    boton.classList.toggle("activa", modelo === modeloSeleccionado);
    boton.addEventListener("click", () => {
      modeloSeleccionado = modelo;
      paginaActual = 0;
      [...lista.children].forEach(b => b.classList.toggle("activa", b === boton));
      cargarProductos();
    });
    lista.appendChild(boton);
  });
}

function marcarCategoriaActiva() {
  [...contenedorCategorias.children].forEach(b => {
    b.classList.toggle("activa", b.textContent === categoriaSeleccionada);
  });
}

async function cargarProductos() {
  estadoCatalogo.textContent = "Cargando productos...";
  contenedorProductos.replaceChildren();
  contenedorPaginacion.replaceChildren();

  let consulta = db.from("productos")
    .select("id,nombre,codigo,categoria,modelo,descripcion,precio,creado_en,fotografias(ruta)", { count: "exact" })
    .order("creado_en", { ascending: false })
    .range(paginaActual * POR_PAGINA, (paginaActual + 1) * POR_PAGINA - 1);

  if (categoriaSeleccionada !== "Todos") consulta = consulta.eq("categoria", categoriaSeleccionada);
  if (categoriaSeleccionada !== "Todos" && modeloSeleccionado !== "Todos") consulta = consulta.eq("modelo", modeloSeleccionado);
  if (textoBusqueda) consulta = consulta.ilike("nombre", `%${textoBusqueda}%`);

  const { data, error, count } = await consulta;
  if (error) {
    estadoCatalogo.textContent = "No se pudieron cargar los productos. Comprueba la conexión con Supabase.";
    console.error(error);
    return;
  }

  totalProductos = count || 0;
  estadoCatalogo.textContent = totalProductos
    ? `Mostrando ${paginaActual * POR_PAGINA + 1}–${Math.min((paginaActual + 1) * POR_PAGINA, totalProductos)} de ${totalProductos} productos`
    : "No encontramos productos con esa búsqueda.";

  data.forEach(mostrarTarjeta);
  mostrarPaginacion();
}

let fotosModal = [];
let indiceFotoModal = 0;

function actualizarFotoModal() {
  const imagen = document.getElementById("modal-imagen");
  const anterior = document.getElementById("foto-anterior");
  const siguiente = document.getElementById("foto-siguiente");
  const contador = document.getElementById("modal-contador");
  if (!fotosModal.length) {
    imagen.hidden = true;
    contador.textContent = "Este producto no tiene fotografías.";
    anterior.hidden = true;
    siguiente.hidden = true;
    return;
  }
  imagen.hidden = false;
  imagen.src = fotosModal[indiceFotoModal];
  contador.textContent = `${indiceFotoModal + 1} de ${fotosModal.length}`;
  anterior.hidden = fotosModal.length < 2;
  siguiente.hidden = fotosModal.length < 2;
}

function abrirDetalleProducto(producto) {
  const fotos = (producto.fotografias || []).map(f => urlFoto(f.ruta));
  fotosModal = fotos;
  indiceFotoModal = 0;
  document.getElementById("modal-nombre").textContent = producto.nombre;
  document.getElementById("modal-categoria").textContent = [producto.categoria, producto.modelo].filter(Boolean).join(" · ");
  document.getElementById("modal-codigo").textContent = producto.codigo ? `Código: ${producto.codigo}` : "";
  document.getElementById("modal-descripcion").textContent = producto.descripcion || "Sin descripción disponible.";
  document.getElementById("modal-precio").textContent = `S/ ${Number(producto.precio).toFixed(2)}`;
  const mensaje = [
    "Hola, deseo consultar por este producto:",
    `Nombre: ${producto.nombre}`,
    `Código: ${producto.codigo || "Sin código"}`,
    `Precio: S/ ${Number(producto.precio).toFixed(2)}`,
    fotos.length ? `Fotografía: ${fotos[0]}` : "Este producto no tiene fotografía registrada."
  ].join("\n");
  const whatsapp = document.getElementById("modal-whatsapp");
  whatsapp.href = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  whatsapp.onclick = event => {
    if (!/^\d{10,15}$/.test(NUMERO_WHATSAPP)) {
      event.preventDefault();
      alert("Configura el número de WhatsApp del negocio en js/conexion.js.");
    }
  };
  actualizarFotoModal();
  document.getElementById("modal-producto").showModal();
}

function mostrarTarjeta(producto) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "tarjeta tarjeta-clicable";
  tarjeta.tabIndex = 0;
  tarjeta.setAttribute("role", "button");
  tarjeta.setAttribute("aria-label", `Ver detalles de ${producto.nombre}`);

  const galeria = document.createElement("div");
  galeria.className = "galeria";
  const fotos = producto.fotografias || [];
  if (fotos.length) {
    const img = document.createElement("img");
    img.src = urlFoto(fotos[0].ruta);
    img.alt = producto.nombre;
    img.loading = "lazy";
    galeria.appendChild(img);
    if (fotos.length > 1) {
      const indicador = document.createElement("span");
      indicador.className = "indicador-fotos";
      indicador.textContent = `${fotos.length} fotos`;
      galeria.appendChild(indicador);
    }
  } else {
    const sinFoto = document.createElement("div");
    sinFoto.className = "sin-foto";
    sinFoto.textContent = "Sin fotografía";
    galeria.appendChild(sinFoto);
  }

  const nombre = document.createElement("h3");
  nombre.textContent = producto.nombre;
  const categoria = document.createElement("p");
  categoria.className = "descripcion";
  categoria.textContent = producto.categoria || "";
  const precio = document.createElement("p");
  precio.className = "precio";
  precio.textContent = `S/ ${Number(producto.precio).toFixed(2)}`;
  const detalle = document.createElement("p");
  detalle.className = "texto-ver-detalle";
  detalle.textContent = "Toca para ver detalles";

  const enlace = document.createElement("a");
  enlace.className = "boton-whatsapp";
  const fotoPrincipal = fotos.length ? urlFoto(fotos[0].ruta) : "";
  const mensajeWhatsApp = [
    "Hola, deseo consultar por este producto:",
    `Nombre: ${producto.nombre}`,
    `Código: ${producto.codigo || "Sin código"}`,
    `Precio: S/ ${Number(producto.precio).toFixed(2)}`,
    fotoPrincipal ? `Fotografía: ${fotoPrincipal}` : "Este producto no tiene fotografía registrada."
  ].join("\n");
  enlace.href = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensajeWhatsApp)}`;
  enlace.target = "_blank";
  enlace.rel = "noopener noreferrer";
  enlace.textContent = "Consultar por WhatsApp";
  if (!/^\d{10,15}$/.test(NUMERO_WHATSAPP)) {
    enlace.href = "#";
    enlace.addEventListener("click", e => {
      e.preventDefault();
      alert("Configura el número de WhatsApp del negocio en js/conexion.js.");
    });
  }

  tarjeta.addEventListener("click", event => {
    if (event.target.closest("a")) return;
    abrirDetalleProducto(producto);
  });
  tarjeta.addEventListener("keydown", event => {
    if ((event.key === "Enter" || event.key === " ") && event.target === tarjeta) {
      event.preventDefault();
      abrirDetalleProducto(producto);
    }
  });
  tarjeta.append(galeria, nombre, categoria, precio, detalle, enlace);
  contenedorProductos.appendChild(tarjeta);
}

// Controles de la ventana emergente de detalles.
document.getElementById("cerrar-modal").addEventListener("click", () => {
  document.getElementById("modal-producto").close();
});
document.getElementById("foto-anterior").addEventListener("click", () => {
  if (!fotosModal.length) return;
  indiceFotoModal = (indiceFotoModal - 1 + fotosModal.length) % fotosModal.length;
  actualizarFotoModal();
});
document.getElementById("foto-siguiente").addEventListener("click", () => {
  if (!fotosModal.length) return;
  indiceFotoModal = (indiceFotoModal + 1) % fotosModal.length;
  actualizarFotoModal();
});
document.getElementById("modal-producto").addEventListener("click", event => {
  if (event.target.id === "modal-producto") event.currentTarget.close();
});

function mostrarPaginacion() {
  const paginas = Math.ceil(totalProductos / POR_PAGINA);
  if (paginas <= 1) return;

  const anterior = document.createElement("button");
  anterior.type = "button";
  anterior.textContent = "Anterior";
  anterior.disabled = paginaActual === 0;
  anterior.addEventListener("click", () => {
    paginaActual--;
    cargarProductos();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const texto = document.createElement("span");
  texto.textContent = `Página ${paginaActual + 1} de ${paginas}`;

  const siguiente = document.createElement("button");
  siguiente.type = "button";
  siguiente.textContent = "Siguiente";
  siguiente.disabled = paginaActual >= paginas - 1;
  siguiente.addEventListener("click", () => {
    paginaActual++;
    cargarProductos();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  contenedorPaginacion.append(anterior, texto, siguiente);
}

document.getElementById("buscar").addEventListener("input", event => {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(() => {
    textoBusqueda = event.target.value.trim();
    paginaActual = 0;
    cargarProductos();
  }, 300);
});

(async function iniciarCatalogo() {
  document.getElementById("modelos-contenedor").hidden = true;
  await cargarCategorias();
  await cargarProductos();
})();
