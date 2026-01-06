module Spree
  class ProductReviewsController < Spree::StoreController
    helper Spree::BaseHelper
    before_action :load_product, only: %i[index new create destroy]
    before_action :authenticate_user!, only: %i[new create]

    Spree::ProductReview.class_eval do
      has_many_attached :images
      _validators.delete(:images)
      validate :validate_media_content_type

      def validate_media_content_type
        return unless images.attached?
        images.each do |file|
          unless file.content_type.in?(%w[image/jpeg image/png image/webp image/gif video/mp4 video/quicktime video/webm])
            errors.add(:images, "Invalid format")
          end
        end
      end
    end

    def new
      @product_review = Spree::ProductReview.new(product: @product)
      authorize! :create, @product_review
    end

    def create
      @product_review = Spree::ProductReview.new(product_review_params)
      @product_review.product = @product
      @product_review.user = spree_current_user
      
      @product_review.product_name = @product.name
      
      @product_review.purchase_date = spree_current_user.recent_purchase_date_for(@product)
      @product_review.ip_address = request.remote_ip
      @product_review.locale = I18n.locale.to_s

      authorize! :create, @product_review

      if Spree::ProductReview.exists?(user_id: spree_current_user.id, product_id: @product.id)
        flash[:error] = "You have already reviewed this product."
        redirect_to spree.product_path(@product) and return
      end
      
      default_status = (current_store.preferred_review_status_default rescue 'pending')
      should_approve = (default_status == 'approved')
      spam_detected = false

      if (current_store.preferred_disable_review_links rescue false) && @product_review.review.present?
        if @product_review.review.match?(%r{https?://|www\.|[a-zA-Z0-9]+\.(com|net|org|info|biz)})
          should_approve = false
          spam_detected = true
        end
      end

      if (current_store.preferred_disable_review_emails rescue false) && @product_review.review.present?
        if @product_review.review.match?(%r{[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}})
          should_approve = false
          spam_detected = true
        end
      end

      if (current_store.preferred_block_spam_reviews rescue false) && @product_review.review.present?
        custom_words = (current_store.preferred_spam_words || "").split(',').map(&:strip).reject(&:empty?)
        custom_words = %w[casino viagra crypto bitcoin lottery loan investment] if custom_words.empty?
        
        full_text = "#{@product_review.title} #{@product_review.review}".downcase
        
        if custom_words.any? { |word| full_text.include?(word.downcase) }
          should_approve = false
          spam_detected = true
        end
      end

      @product_review.approved = should_approve
      @product_review.spam = spam_detected

      if @product_review.save
        if @product_review.approved?
          puts "SAVE ERROR: #{@product_review.errors.full_messages.join(', ')}"
          flash[:success] = Spree.t("product_review.flash_messages.create.approved")
        else
          puts "SAVE ERROR: #{@product_review.errors.full_messages.join(', ')}"
          flash[:success] = Spree.t("product_review.flash_messages.create.success")
        end
        redirect_to spree.product_path(@product)
      else
        puts "REVIEW SAVE FAILED: #{@product_review.errors.full_messages}"
        puts "SAVE ERROR: #{@product_review.errors.full_messages.join(', ')}"
        flash[:error] = Spree.t("product_review.flash_messages.create.failure")
        render :new
      end
    end
    
    def index
      @product_reviews = @product.product_reviews.approved.order(created_at: :desc)
    end

    def destroy
      @product_review = Spree::ProductReview.find(params[:id])
      @product_review.destroy
      session[:_csrf_token] = nil
      redirect_to spree.product_path(@product), notice: Spree.t(:review_deleted)
    end

    private

    def load_product
      @product = Spree::Product.friendly.find(params[:product_id])
    end

    def product_review_params
      p = params.require(:product_review).permit(
        :rating, :review, :show_identifier, :title, images: []
      )
      
      if p[:images].is_a?(Array)
        p[:images].reject!(&:blank?)
      end
      
      p
    end

    def authenticate_user!
      return if spree_current_user
      session[:spree_user_return_to] = request.fullpath
      redirect_to spree.login_path, alert: Spree.t(:please_log_in)
    end
  end
end
