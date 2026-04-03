var express = require('express');
var check_logged = require("./login_check");
var url = require("url");
var fs = require("fs");
var path = require("path");
var multer = require("multer");
var db_products = require("../model/products");
var router = express.Router();

var uploadsDir = path.join(__dirname, "..", "public", "images");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

var upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadsDir);
        },
        filename: function (req, file, cb) {
            var extension = path.extname(file.originalname || "").toLowerCase();
            if (extension === "") {
                extension = ".jpg";
            }

            var rawBaseName = path.basename(file.originalname || "product", extension).toLowerCase();
            var safeBaseName = rawBaseName
                .replace(/[^a-z0-9-_]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");

            if (safeBaseName === "") {
                safeBaseName = "product";
            }

            var uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1000000000);
            cb(null, safeBaseName + "-" + uniqueSuffix + extension);
        }
    }),
    fileFilter: function (req, file, cb) {
        var allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

        if (allowedMimeTypes.indexOf(file.mimetype) === -1) {
            return cb(new Error("Only JPG, PNG, GIF and WEBP image files are allowed."));
        }

        return cb(null, true);
    },
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

function ensure_admin(req, res) {
    if (req.session.logged == undefined || req.session.logged == false) {
        res.redirect("/login?returnurl=/admin/products");
        return false;
    }

    if (req.session.user_name !== "admin") {
        res.status(403).render('error', {
            layout: 'layout-login',
            message: 'Admin access only',
            error: {}
        });
        return false;
    }

    return true;
}

function default_admin_values() {
    return {
        name: '',
        description: '',
        price: '',
        image: ''
    };
}

function remove_uploaded_file(file) {
    if (file && file.path) {
        fs.unlink(file.path, function () {});
    }
}

function render_admin_products(req, res, options) {
    var safeOptions = options || {};
    var values = safeOptions.values || default_admin_values();
    var message = safeOptions.message || '';
    var messageType = safeOptions.messageType || '';
    var statusCode = safeOptions.statusCode || 200;

    db_products.list()
        .then(function (products) {
            return res.status(statusCode).render('admin_products', {
                values: values,
                message: message,
                messageType: messageType,
                products: products
            });
        })
        .catch(function (err) {
            console.log(err);

            return res.status(statusCode).render('admin_products', {
                values: values,
                message: message !== '' ? message : 'Could not load products list.',
                messageType: message !== '' ? messageType : 'error',
                products: []
            });
        });
}


/* GET home page. */
router.get('/', function(req, res, next) {

    check_logged(req, res);

    db_products.list()
        .then(function (data) {
            res.render('products', { products: data });
        })
        .catch(function (err) {
            console.log(err);

            res.render('products', { products: [] });
        });
});

router.get('/products/purchased', function(req, res, next) {

    check_logged(req, res);

    db_products.getPurchased(req.session.user_name)
        .then(function (data) {

            console.log(data);
            res.render('bought_products', { products: data });
        })
        .catch(function (err) {
            console.log(err);

            res.render('bought_products', { products: [] });
        });
});

router.get('/products/detail', function(req, res, next) {

    check_logged(req, res);

    var url_params = url.parse(req.url, true).query;

    var product_id = url_params.id;

    db_products.getProduct(product_id)
        .then(function (data) {
            res.render('product_detail', { product: data });
        })
        .catch(function (err) {
            console.log(err);

            res.render('products', { products: [] });
        });
});



router.get('/products/search', function(req, res, next) {

    check_logged(req, res);

    var url_params = url.parse(req.url, true).query;
    var query = url_params.q;

    if (query == undefined) {
        res.render('search', { in_query: "", products: [] });
        return;
    }

    db_products.search(query)
        .then(function (data) {

            res.render('search', { in_query: query, products: data });
        })
        .catch(function (err) {

            console.log(err);

            res.render('search', { in_query: query, products: [] });
        });

});


router.get('/admin/products', function(req, res, next) {

    if (!ensure_admin(req, res)) {
        return;
    }

    return render_admin_products(req, res, {
        values: default_admin_values()
    });
});


router.post('/admin/products', function(req, res, next) {

    if (!ensure_admin(req, res)) {
        return;
    }

    upload.single('image_file')(req, res, function (uploadErr) {
        var values = {
            name: (req.body.name || '').trim(),
            description: (req.body.description || '').trim(),
            price: (req.body.price || '').trim(),
            image: (req.body.image || '').trim()
        };

        if (uploadErr) {
            return render_admin_products(req, res, {
                values: values,
                message: uploadErr.message,
                messageType: 'error',
                statusCode: 400
            });
        }

        if (req.file && req.file.filename) {
            values.image = req.file.filename;
        }

        var parsedPrice = parseInt(values.price, 10);

        if (values.name === '' || values.description === '') {
            remove_uploaded_file(req.file);
            return render_admin_products(req, res, {
                values: values,
                message: 'Name and description are required.',
                messageType: 'error',
                statusCode: 400
            });
        }

        if (values.image === '') {
            remove_uploaded_file(req.file);
            return render_admin_products(req, res, {
                values: values,
                message: 'Upload an image file or provide an existing image filename.',
                messageType: 'error',
                statusCode: 400
            });
        }

        if (isNaN(parsedPrice) || parsedPrice < 0) {
            remove_uploaded_file(req.file);
            return render_admin_products(req, res, {
                values: values,
                message: 'Price must be a positive number.',
                messageType: 'error',
                statusCode: 400
            });
        }

        db_products.createProduct({
            name: values.name,
            description: values.description,
            price: parsedPrice,
            image: values.image
        })
            .then(function () {
                return render_admin_products(req, res, {
                    values: default_admin_values(),
                    message: 'Product created successfully.',
                    messageType: 'success'
                });
            })
            .catch(function (err) {
                console.log(err);

                remove_uploaded_file(req.file);

                return render_admin_products(req, res, {
                    values: values,
                    message: 'Could not create the product. Please try again.',
                    messageType: 'error',
                    statusCode: 500
                });
            });
    });
});


router.post('/admin/products/delete', function(req, res, next) {

    if (!ensure_admin(req, res)) {
        return;
    }

    var productId = parseInt(req.body.product_id, 10);
    if (isNaN(productId)) {
        return render_admin_products(req, res, {
            values: default_admin_values(),
            message: 'Invalid product id.',
            messageType: 'error',
            statusCode: 400
        });
    }

    db_products.deleteProduct(productId)
        .then(function () {
            return render_admin_products(req, res, {
                values: default_admin_values(),
                message: 'Product deleted successfully.',
                messageType: 'success'
            });
        })
        .catch(function (err) {
            console.log(err);

            return render_admin_products(req, res, {
                values: default_admin_values(),
                message: 'Could not delete product. Please try again.',
                messageType: 'error',
                statusCode: 500
            });
        });
});


router.all('/products/buy', function(req, res, next) {

    check_logged(req, res);

    var params = null;
    if (req.method == "GET"){
        params = url.parse(req.url, true).query;
    } else {
        params = req.body;
    }

    var cart = null;

    try {

        if (params.price == undefined){
            throw new Error("Missing parameter 'price'");
        }

        cart = {
            mail: params.mail,
            address: params.address,
            ship_date: params.ship_date,
            phone: params.phone,
            product_id: params.product_id,
            product_name: params.product_name,
            username: req.session.user_name,
            price: params.price.substr(0, params.price.length - 1) // remove "€" symbol
        }

        // Check mail format
        var re = /^([a-zA-Z0-9])(([\-.]|[_]+)?([a-zA-Z0-9]+))*(@){1}[a-z0-9]+[.]{1}(([a-z]{2,3})|([a-z]{2,3}[.]{1}[a-z]{2,3}))$/
        if (!re.test(cart.mail)){
            throw new Error("Invalid mail format");
        }

        // Checks all values is set
        for (var prop in cart){
            if (cart[prop] == undefined){
                throw new Error("Missing parameter '" + prop + "'");
            }
        }

    }
    catch (err){
        return res.status(400).json({message: err.message});
    }

    db_products.purchase(cart)
        .catch(function (err) {

            console.log(err);

            return res.json({message: "Product purchased correctly"});
        });

});



module.exports = router;
