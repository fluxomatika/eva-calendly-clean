// api/test.js - Função de teste simples
module.exports = async (req, res) => {
  console.log('🧪 TESTE FUNCTION EXECUTADA!');
  console.log('Method:', req.method);
  console.log('Body:', req.body);
  
  return res.status(200).json({
    status: 'success',
    message: 'Função de teste funcionando!',
    method: req.method,
    timestamp: new Date().toISOString(),
    body: req.body
  });
};
