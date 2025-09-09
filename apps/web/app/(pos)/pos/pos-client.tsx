async function cobrar(){
  if(items.length===0) return;

  const payload = {
    branch_id:'22222222-2222-2222-2222-222222222222',
    company_id: COMPANY_ID,
    customer_id: null,
    desc_jubilado: descJub ? 0.15 : 0,
    items: items.map(x=>({
      product_id:x.product_id, cantidad:x.cantidad, precio_unit:x.precio_unit,
      itbms_rate:x.itbms_rate||0, descuento:x.descuento||0
    })),
    pagos: [{ metodo:'efectivo', monto: tot.total }]
  };

  try {
    const r = await fetch('/api/pos/cobrar', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const txt = await r.text();
    if(!r.ok){
      alert('Error al cobrar:\n' + (txt || '(sin detalle)'));
      return;
    }
    let data:any = {};
    try { data = JSON.parse(txt); } catch {}
    clear();
    if (data?.auto_emit_dgi) {
      if (data?.invoice?.ok) {
        alert('Venta OK y DGI emitida.');
      } else {
        alert('Venta OK. (Aviso) No se pudo emitir DGI automáticamente.\n' + (data?.invoice?.error || ''));
      }
    } else {
      alert('Venta OK.');
    }
  } catch (e:any) {
    alert('Error al cobrar: ' + (e?.message || String(e)));
  }
}
