async function addProps(req,res,next){
    req.body.allDay = false;
    req.body.display = 'auto';
    req.body.backgroundColor = '#191919';
    req.body.borderColor = '#595959';
    req.body.textColor = '#ffffff';
    req.body.estado = 'PENDIENTE'
    next();
}

module.exports = {
    addProps
}