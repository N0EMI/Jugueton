
const login = document.getElementById("login");
const panel = document.getElementById("panel");
const formulario = document.getElementById("form-producto");

const adminId = "UUID_DEL_ADMIN";

async function verificarSesion() {
    const { data } = await db.auth.getSession();
    const usuario = data.session?.user;

    const autorizado = usuario?.id === adminId;

    login.hidden = autorizado;
    panel.hidden = !autorizado;

    if (autorizado) cargarLista();
}

document.getElementById("ingresar").onclick =
async () => {
    const { error } = await db.auth.signInWithPassword({
        email: document.getElementById("correo").value,
        password: document.getElementById("contrasena").value
    });

    document.getElementById("mensaje").textContent =
        error ? "Datos incorrectos." : "Acceso correcto.";

    await verificarSesion();
};

document.getElementById("salir").onclick =
async () => {
    await db.auth.signOut();
    formulario.reset();
    verificarSesion();
};

async function cargarLista() {
    const { data, error } = await db
        .from("productos")
        .select("*")
        .order("creado_en", { ascending: false });

    const lista = document.getElementById("lista-admin");
    lista.innerHTML = "";

    if (error) {
        lista.textContent = "Error al cargar productos.";
        return;
    }

    data.forEach(p => {
        const fila = document.createElement("div");
        fila.className = "tarjeta";

        const nombre = document.createElement("h3");
        nombre.textContent = p.nombre;

        const precio = document.createElement("p");
        precio.textContent = `S/ ${p.precio}`;

        const editar = document.createElement("button");
        editar.textContent = "Editar";
        editar.onclick = () => editarProducto(p);

        const eliminar = document.createElement("button");
        eliminar.textContent = "Eliminar";
        eliminar.onclick = () => eliminarProducto(p.id);

        fila.append(nombre, precio, editar, eliminar);
        lista.appendChild(fila);
    });
}

function editarProducto(p) {
    document.getElementById("producto-id").value = p.id;
    document.getElementById("nombre").value = p.nombre;
    document.getElementById("codigo").value = p.codigo || "";
    document.getElementById("categoria").value = p.categoria;
    document.getElementById("descripcion").value =
        p.descripcion || "";
    document.getElementById("precio").value = p.precio;

    document.getElementById("titulo-formulario")
        .textContent = "Editar producto";

    document.getElementById("cancelar").hidden = false;
}

document.getElementById("cancelar").onclick = () => {
    formulario.reset();
    document.getElementById("producto-id").value = "";
    document.getElementById("titulo-formulario")
        .textContent = "Agregar producto";
    document.getElementById("cancelar").hidden = true;
};

formulario.onsubmit = async (e) => {
    e.preventDefault();

    const id = document.getElementById("producto-id").value;

    const producto = {
        nombre: document.getElementById("nombre").value.trim(),
        codigo: document.getElementById("codigo").value.trim() || null,
        categoria: document.getElementById("categoria").value.trim(),
        descripcion: document.getElementById("descripcion").value.trim(),
        precio: Number(document.getElementById("precio").value)
    };

    const estado = document.getElementById("estado");
    estado.textContent = "Guardando...";

    let resultado;

    if (id) {
        resultado = await db.from("productos")
            .update(producto).eq("id", id).select().single();
    } else {
        resultado = await db.from("productos")
            .insert(producto).select().single();
    }

    if (resultado.error) {
        estado.textContent = resultado.error.message;
        return;
    }

    const productoId = resultado.data.id;
    const archivos = document.getElementById("imagenes").files;

    for (const archivo of archivos) {
        if (!archivo.type.startsWith("image/")) continue;

        if (archivo.size > 5 * 1024 * 1024) {
            estado.textContent = "Una imagen supera los 5 MB.";
            return;
        }

        const ruta = `${productoId}/${crypto.randomUUID()}`;

        const subida = await db.storage
            .from("productos")
            .upload(ruta, archivo);

        if (subida.error) {
            estado.textContent = subida.error.message;
            return;
        }

        const registro = await db.from("fotografias").insert({
            producto_id: productoId,
            ruta: ruta
        });

        if (registro.error) {
            estado.textContent = registro.error.message;
            return;
        }
    }

    estado.textContent = "Producto guardado correctamente.";

    formulario.reset();
    document.getElementById("producto-id").value = "";
    document.getElementById("titulo-formulario")
        .textContent = "Agregar producto";
    document.getElementById("cancelar").hidden = true;

    cargarLista();
};

async function eliminarProducto(id) {
    if (!confirm("¿Deseas eliminar este producto?")) return;

    const { data: fotos, error: errorFotos } = await db
        .from("fotografias")
        .select("ruta")
        .eq("producto_id", id);

    if (errorFotos) {
        alert(errorFotos.message);
        return;
    }

    if (fotos.length) {
        const { error } = await db.storage
            .from("productos")
            .remove(fotos.map(f => f.ruta));

        if (error) {
            alert(error.message);
            return;
        }
    }

    const { error } = await db.from("productos")
        .delete().eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }

    cargarLista();
}

verificarSesion();

db.auth.onAuthStateChange(() => {
    verificarSesion();
});
