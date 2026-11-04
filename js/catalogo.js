
let productos = [];
let categoriaSeleccionada = "Todos";

async function cargarProductos() {
    const { data, error } = await db
        .from("productos")
        .select("*, fotografias(ruta)")
        .order("creado_en", { ascending: false });

    if (error) {
        document.getElementById("productos").textContent =
            "No se pudieron cargar los productos.";
        console.error(error);
        return;
    }

    productos = data;
    mostrarCategorias();
    mostrarProductos();
}

function mostrarCategorias() {
    const contenedor = document.getElementById("categorias");

    const categorias = [
        "Todos",
        ...new Set(productos.map(p => p.categoria))
    ];

    contenedor.innerHTML = "";

    categorias.forEach(cat => {
        const boton = document.createElement("button");
        boton.textContent = cat;

        boton.onclick = () => {
            categoriaSeleccionada = cat;
            mostrarProductos();
        };

        contenedor.appendChild(boton);
    });
}

function mostrarProductos() {
    const texto = document.getElementById("buscar")
        .value.toLowerCase();

    const contenedor = document.getElementById("productos");
    contenedor.innerHTML = "";

    const filtrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(texto) &&
        (categoriaSeleccionada === "Todos" ||
         p.categoria === categoriaSeleccionada)
    );

    if (!filtrados.length) {
        contenedor.textContent = "No hay productos disponibles.";
        return;
    }

    filtrados.forEach(p => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta";

        const galeria = document.createElement("div");
        galeria.className = "galeria";

        (p.fotografias || []).forEach(f => {
            const img = document.createElement("img");
            img.src = db.storage
                .from("productos")
                .getPublicUrl(f.ruta).data.publicUrl;
            img.alt = p.nombre;
            img.loading = "lazy";
            galeria.appendChild(img);
        });

        const nombre = document.createElement("h3");
        nombre.textContent = p.nombre;

        const precio = document.createElement("h3");
        precio.textContent = `S/ ${Number(p.precio).toFixed(2)}`;

        const boton = document.createElement("button");
        boton.textContent = "Consultar por WhatsApp";

        boton.onclick = () => {
            const numero = "519XXXXXXXX";
            const mensaje = encodeURIComponent(
                `Hola, deseo consultar por ${p.nombre}`
            );

            window.open(
                `https://wa.me/${numero}?text=${mensaje}`,
                "_blank"
            );
        };

        tarjeta.append(galeria, nombre, precio, boton);
        contenedor.appendChild(tarjeta);
    });
}

document.getElementById("buscar")
    .addEventListener("input", mostrarProductos);

cargarProductos();
