
const ADMIN_ID = "b4a18fda-8032-45e8-8b6b-f0e4a2608a68";

const login = document.getElementById("login");
const panel = document.getElementById("panel");
const formulario = document.getElementById("form-producto");
const estado = document.getElementById("estado");
const listaAdmin = document.getElementById("lista-admin");
const fotosActuales = document.getElementById("fotos-actuales");
const fotosActualesContenedor = document.getElementById("fotos-actuales-contenedor");

let productoEnEdicion = null;
let productosAdmin = [];
let fotosEnEdicion = [];

function limpiarFormulario() {
  formulario.reset();
  document.getElementById("producto-id").value = "";
  document.getElementById("titulo-formulario").textContent = "Agregar producto";
  document.getElementById("cancelar").hidden = true;
  document.getElementById("vista-previa").replaceChildren();
  fotosActuales.replaceChildren();
  fotosActualesContenedor.hidden = true;

  productoEnEdicion = null;
  fotosEnEdicion = [];
}

// VERIFICAR SESIÓN
async function verificarSesion(session = null) {
  let usuario = session?.user;

  if (session === null) {
    const { data, error } = await db.auth.getSession();

    if (error) console.error(error);
    usuario = data.session?.user;
  }

  const autorizado = usuario?.id === ADMIN_ID;

  login.hidden = autorizado;
  panel.hidden = !autorizado;

  if (autorizado) {
    await cargarLista();
  } else {
    limpiarFormulario();
  }
}

// INICIAR SESIÓN
document.getElementById("form-login").addEventListener("submit", async event => {
  event.preventDefault();

  const mensaje = document.getElementById("mensaje-login");
  mensaje.textContent = "Verificando acceso...";

  const { error } = await db.auth.signInWithPassword({
    email: document.getElementById("correo").value.trim(),
    password: document.getElementById("contrasena").value
  });

  if (error) {
    mensaje.textContent = "No se pudo iniciar sesión. Revisa el correo y la contraseña.";
    console.error(error);
    return;
  }

  mensaje.textContent = "Acceso correcto.";
  await verificarSesion();
});

// CERRAR SESIÓN
document.getElementById("salir").addEventListener("click", async () => {
  await db.auth.signOut();
  limpiarFormulario();
  await verificarSesion();
});

// VIGILAR SESIÓN
db.auth.onAuthStateChange((_event, session) => {
  if (
    _event === "SIGNED_IN" ||
    _event === "SIGNED_OUT" ||
    _event === "INITIAL_SESSION"
  ) {
    setTimeout(() => verificarSesion(session), 0);
  }
});

// CARGAR PRODUCTOS
async function cargarLista() {
  const { data, error } = await db.from("productos")
    .select("id,nombre,categoria,precio")
    .order("creado_en", { ascending: false })
    .limit(1000);

  if (error) {
    listaAdmin.textContent = "Error al cargar productos: " + error.message;
    return;
  }

  productosAdmin = data || [];
  dibujarLista(productosAdmin);
}

// MOSTRAR PRODUCTOS
function dibujarLista(items) {
  listaAdmin.replaceChildren();

  if (!items.length) {
    listaAdmin.textContent = "Todavía no hay productos registrados.";
    return;
  }

  items.forEach(producto => {
    const fila = document.createElement("article");
    fila.className = "panel fila-admin";

    const info = document.createElement("div");

    const nombre = document.createElement("h4");
    nombre.textContent = producto.nombre;

    const detalle = document.createElement("p");
    detalle.textContent =
      `${producto.categoria || "Sin categoría"} · S/ ${Number(producto.precio).toFixed(2)}`;

    info.append(nombre, detalle);

    const acciones = document.createElement("div");
    acciones.className = "fila-admin-acciones";

    const editar = document.createElement("button");
    editar.type = "button";
    editar.textContent = "Editar";
    editar.addEventListener("click", () => editarProducto(producto.id));

    const eliminar = document.createElement("button");
    eliminar.type = "button";
    eliminar.className = "boton-peligro";
    eliminar.textContent = "Eliminar";
    eliminar.addEventListener("click", () => eliminarProducto(producto.id));

    acciones.append(editar, eliminar);
    fila.append(info, acciones);
    listaAdmin.appendChild(fila);
  });
}

// BUSCAR PRODUCTOS
document.getElementById("buscar-admin").addEventListener("input", event => {
  const q = event.target.value.trim().toLowerCase();

  dibujarLista(productosAdmin.filter(p =>
    (p.nombre || "").toLowerCase().includes(q) ||
    (p.categoria || "").toLowerCase().includes(q)
  ));
});

// EDITAR PRODUCTO
async function editarProducto(id) {
  const { data: producto, error } = await db.from("productos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  productoEnEdicion = producto;

  document.getElementById("producto-id").value = producto.id;
  document.getElementById("nombre").value = producto.nombre || "";
  document.getElementById("categoria").value = producto.categoria || "";
  document.getElementById("descripcion").value = producto.descripcion || "";
  document.getElementById("precio").value = producto.precio ?? "";

  document.getElementById("titulo-formulario").textContent = "Editar producto";
  document.getElementById("cancelar").hidden = false;

  const { data: fotos, error: errorFotos } = await db.from("fotografias")
    .select("id,ruta")
    .eq("producto_id", id);

  if (errorFotos) {
    alert(errorFotos.message);
    return;
  }

  fotosEnEdicion = fotos || [];
  dibujarFotosActuales();

  document.getElementById("form-producto").scrollIntoView({
    behavior: "smooth"
  });
}

// MOSTRAR FOTOGRAFÍAS ACTUALES
function dibujarFotosActuales() {
  fotosActuales.replaceChildren();
  fotosActualesContenedor.hidden = fotosEnEdicion.length === 0;

  fotosEnEdicion.forEach(foto => {
    const caja = document.createElement("div");
    caja.className = "mini-foto";

    const img = document.createElement("img");
    img.src = db.storage.from("productos").getPublicUrl(foto.ruta).data.publicUrl;
    img.alt = "Fotografía del producto";

    const quitar = document.createElement("button");
    quitar.type = "button";
    quitar.textContent = "×";
    quitar.title = "Eliminar fotografía";
    quitar.addEventListener("click", () => quitarFoto(foto));

    caja.append(img, quitar);
    fotosActuales.appendChild(caja);
  });
}

// ELIMINAR UNA FOTOGRAFÍA
async function quitarFoto(foto) {
  if (!confirm("¿Eliminar esta fotografía?")) return;

  const { error: errorStorage } = await db.storage.from("productos").remove([foto.ruta]);

  if (errorStorage) {
    alert(errorStorage.message);
    return;
  }

  const { error } = await db.from("fotografias")
    .delete()
    .eq("id", foto.id);

  if (error) {
    alert(error.message);
    return;
  }

  fotosEnEdicion = fotosEnEdicion.filter(f => f.id !== foto.id);
  dibujarFotosActuales();
}

// VISTA PREVIA DE FOTOGRAFÍAS NUEVAS
document.getElementById("imagenes").addEventListener("change", event => {
  const vista = document.getElementById("vista-previa");
  vista.replaceChildren();

  const seleccionadas = [...event.target.files];
  const disponibles = 3 - fotosEnEdicion.length;

  if (seleccionadas.length > disponibles) {
    alert(`Puedes agregar como máximo ${disponibles} fotografía(s) más. Cada producto admite hasta 3.`);
    event.target.value = "";
    return;
  }

  seleccionadas.forEach(archivo => {
    if (!archivo.type.startsWith("image/")) return;

    const caja = document.createElement("div");
    caja.className = "mini-foto";

    const img = document.createElement("img");
    img.alt = "Vista previa";
    img.src = URL.createObjectURL(archivo);

    caja.appendChild(img);
    vista.appendChild(caja);
  });
});

// CANCELAR EDICIÓN
document.getElementById("cancelar").addEventListener("click", limpiarFormulario);

// GUARDAR PRODUCTO
formulario.addEventListener("submit", async event => {
  event.preventDefault();

  const botonGuardar = document.getElementById("guardar-producto");
  botonGuardar.disabled = true;
  estado.textContent = "Guardando producto...";

  try {
    const id = document.getElementById("producto-id").value;
    const archivos = [...document.getElementById("imagenes").files];

    // VALIDAR CANTIDAD DE FOTOGRAFÍAS
    const totalFotos = fotosEnEdicion.length + archivos.length;

    if (totalFotos < 1 || totalFotos > 3) {
      estado.textContent =
        `Cada producto debe tener entre 1 y 3 fotografías. Actualmente hay ${fotosEnEdicion.length} y seleccionaste ${archivos.length}.`;
      return;
    }

    // VALIDAR FORMATOS Y TAMAÑOS
    for (const archivo of archivos) {
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(archivo.type)) {
        estado.textContent = `Formato no permitido: ${archivo.name}`;
        return;
      }

      if (archivo.size > 5 * 1024 * 1024) {
        estado.textContent = `La imagen ${archivo.name} supera los 5 MB.`;
        return;
      }
    }

    const producto = {
      nombre: document.getElementById("nombre").value.trim(),
      categoria: document.getElementById("categoria").value.trim(),
      descripcion: document.getElementById("descripcion").value.trim(),
      precio: Number(document.getElementById("precio").value)
    };

    let resultado;

    if (id) {
      resultado = await db.from("productos")
        .update(producto)
        .eq("id", id)
        .select()
        .single();
    } else {
      resultado = await db.from("productos")
        .insert(producto)
        .select()
        .single();
    }

    if (resultado.error) {
      estado.textContent = "No se pudo guardar: " + resultado.error.message;
      return;
    }

    const productoId = resultado.data.id;

    // SUBIR FOTOGRAFÍAS
    for (const archivo of archivos) {
      const extension = archivo.name
        .split(".")
        .pop()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "jpg";

      const ruta = `${productoId}/${crypto.randomUUID()}.${extension}`;

      const { error: errorSubida } = await db.storage.from("productos")
        .upload(ruta, archivo, {
          contentType: archivo.type,
          upsert: false
        });

      if (errorSubida) {
        estado.textContent = "Error al subir imagen: " + errorSubida.message;
        return;
      }

      const { error: errorRegistro } = await db.from("fotografias").insert({
        producto_id: productoId,
        ruta
      });

      if (errorRegistro) {
        await db.storage.from("productos").remove([ruta]);
        estado.textContent = "La imagen se subió, pero no se pudo registrar: " + errorRegistro.message;
        return;
      }
    }

    estado.textContent = "Producto guardado correctamente.";

    limpiarFormulario();
    await cargarLista();

  } catch (error) {
    console.error(error);
    estado.textContent = "Ocurrió un error inesperado: " + error.message;
  } finally {
    botonGuardar.disabled = false;
  }
});

// ELIMINAR PRODUCTO Y SUS FOTOGRAFÍAS
async function eliminarProducto(id) {
  if (!confirm("¿Deseas eliminar este producto y todas sus fotografías?")) return;

  const { data: fotos, error: errorFotos } = await db.from("fotografias")
    .select("id,ruta")
    .eq("producto_id", id);

  if (errorFotos) {
    alert(errorFotos.message);
    return;
  }

  if (fotos?.length) {
    const { error: errorStorage } = await db.storage.from("productos")
      .remove(fotos.map(f => f.ruta));

    if (errorStorage) {
      alert("No se pudieron eliminar las imágenes: " + errorStorage.message);
      return;
    }
  }

  const { error } = await db.from("productos")
    .delete()
    .eq("id", id);

  if (error) {
    alert("No se pudo eliminar el producto: " + error.message);
    return;
  }

  if (productoEnEdicion?.id === id) {
    limpiarFormulario();
  }

  await cargarLista();
}

// COMPROBAR SESIÓN AL INICIAR
verificarSesion();
