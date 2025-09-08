export default function Ticket80({ venta, empresa }: any){
  return (
    <div style={{ width: '72mm', fontFamily:'monospace', fontSize:'12px' }}>
      <div style={{textAlign:'center'}}>
        <div style={{fontWeight:700}}>{empresa?.nombre}</div>
        <div>{empresa?.ruc}</div>
        <div>{empresa?.direccion}</div>
        <hr />
      </div>
      {venta.items?.map((it:any)=> (
        <div key={it.id} style={{display:'flex', justifyContent:'space-between'}}>
          <div>{it.cantidad} x {it.nombre}</div>
          <div>${(it.cantidad*it.precio_unit).toFixed(2)}</div>
        </div>
      ))}
      <hr />
      <div style={{display:'flex', justifyContent:'space-between'}}>
        <div>Total</div><div>${venta.total?.toFixed(2)}</div>
      </div>
      <div style={{textAlign:'center', marginTop:8}}>¡Gracias por su compra!</div>
    </div>
  );
}
