window.usuarios = [
  {
    id: 1,
    nombre: "Usuario Admin",
    email: "unknownshoppersmx@gmail.com",
    password: "shopper#1", // Placeholder
    rol: "admin",
    permisos: [
      "crear_evaluaciones", "editar_evaluaciones", "eliminar_evaluaciones",
      "ver_matriz", "editar_matriz", "eliminar_matriz",
      "ver_graficas_sucursales", "editar_graficas_sucursales", "eliminar_graficas_sucursales",
      "ver_graficas_franquicias", "editar_graficas_franquicias", "eliminar_graficas_franquicias"
    ]
  },
  {
    id: 2,
    nombre: "Usuario Sucursales",
    email: "gop@cafelacabana.com",
    password: "acceso123", // Placeholder
    rol: "gop",
    permisos: [
      "ver_sucursales"
    ]
  },
  {
    id: 3,
    nombre: "Usuario Franquicias",
    email: "franquicias@cafelacabana.com",
    password: "acceso123", // Placeholder
    rol: "franquicias",
    permisos: [
      "ver_franquicias"
    ]
  },
  {
    id: 4,
    nombre: "Usuario DG",
    email: "dg@cafelacabana.com",
    password: "acceso123", // Placeholder
    rol: "dg",
    permisos: [
      "ver_sucursales", "ver_franquicias"
    ]
  }
];