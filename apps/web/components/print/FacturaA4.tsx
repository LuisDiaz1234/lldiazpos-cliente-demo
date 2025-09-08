// apps/web/components/print/FacturaA4.tsx
export default function FacturaA4({ invoice, sale, items, company }: any){
  const fmt = (n:number)=> Number(n||0).toFixed(2);

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui', fontSize: 14 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {company?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo_url} alt="logo" style={{ width:72, height:72, objectFit:'contain' }}/>
          ) : (
            <div style={{ width:72, height:72, background:'#f3f4f6', borderRadius:8 }} />
          )}
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{company?.nombre || 'LLdiazProduction'}</div>
            <div>RUC: {company?.ruc || '-'}</div>
            <div>{company?.direccion || '-'}</div>
            {company?.telefono && <div>Tel: {company.telefono}</div>}
            {company?.email && <div>{company.email}</div>}
          </div>
        </div>

        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>FACTURA</div>
          <div><b>Folio:</b> {invoice?.folio || '-'}</div>
          <div><b>Fecha:</b> {new Date(sale?.fecha).toISOString().slice(0,19).replace('T',' ')}</div>
          {invoice?.qr_url && (
            <div style={{ marginTop: 4 }}>
              <a href={invoice.qr_url} target="_blank" rel="noreferrer">Verificación DGI</a>
            </div>
          )}
        </div>
      </div>

      <hr style={{ margin: '16px 0' }} />

      {/* Items */}
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:'6px' }}>Descripción</th>
            <th style={{ textAlign:'right', borderBottom:'1px solid #ddd', padding:'6px' }}>Cant.</th>
            <th style={{ textAlign:'right', borderBottom:'1px solid #ddd', padding:'6px' }}>Precio</th>
            <th style={{ textAlign:'right', borderBottom:'1px solid #ddd', padding:'6px' }}>ITBMS</th>
            <th style={{ textAlign:'right', borderBottom:'1px solid #ddd', padding:'6px' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((it:any)=>(
            <tr key={it.id}>
              <td style={{ padding:'6px', borderBottom:'1px solid #f1f1f1' }}>
                <div style={{ fontWeight:600 }}>{it.products?.nombre || it.product_id}</div>
                {it.products?.sku && <div style={{ fontSize:12, color:'#6b7280' }}>SKU: {it.products.sku}</div>}
              </td>
              <td style={{ padding:'6px', textAlign:'right', borderBottom:'1px solid #f1f1f1' }}>{fmt(it.cantidad)}</td>
              <td style={{ padding:'6px', textAlign:'right', borderBottom:'1px solid #f1f1f1' }}>${fmt(it.precio_unit)}</td>
              <td style={{ padding:'6px', textAlign:'right', borderBottom:'1px solid #f1f1f1' }}>{fmt(it.itbms_rate*100)}%</td>
              <td style={{ padding:'6px', textAlign:'right', borderBottom:'1px solid #f1f1f1' }}>${fmt(it.cantidad*it.precio_unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales */}
      <div style={{ marginTop: 12, display:'flex', justifyContent:'flex-end' }}>
        <div style={{ width: 320 }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <div>Subtotal</div><div>${fmt(sale?.subtotal)}</div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <div>Descuentos</div><div>-${fmt(sale?.descuento_total)}</div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <div>ITBMS</div><div>${fmt(sale?.itbms_total)}</div>
          </div>
          <hr style={{ margin: '8px 0' }} />
          <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700 }}>
            <div>Total</div><div>${fmt(sale?.total)}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color:'#666' }}>
        Gracias por su compra.
      </div>
    </div>
  );
}
