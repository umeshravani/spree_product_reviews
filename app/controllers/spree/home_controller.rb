module Spree
  class HomeController < (defined?(Spree::StoreController) ? Spree::StoreController : (defined?(Spree::BaseController) ? Spree::BaseController : ActionController::Base))
    def forbidden
      render plain: "You are not authorized to access this page.", status: :forbidden
    end
  end
end
