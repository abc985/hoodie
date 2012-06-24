// Generated by CoffeeScript 1.3.3

define('specs/hoodie/sharing/instance', ['mocks/hoodie', 'hoodie/sharing/instance', 'hoodie/sharing/hoodie', 'hoodie/config'], function(HoodieMock, SharingInstance, SharingHoodie, Config) {
  return describe("SharingInstance", function() {
    beforeEach(function() {
      this.hoodie = new HoodieMock;
      SharingInstance.hoodie = this.hoodie;
      return this.sharing = new SharingInstance;
    });
    return describe("constructor", function() {
      beforeEach(function() {
        spyOn(this.hoodie.store, "uuid").andReturn('new_id');
        spyOn(SharingInstance.prototype, "set");
        return spyOn(SharingInstance.prototype, "add");
      });
      it("should generate an id", function() {
        var sharing;
        sharing = new SharingInstance;
        return expect(sharing.id).toBe('new_id');
      });
      it("should set the attributes", function() {
        var sharing;
        sharing = new SharingInstance({
          funky: 'options'
        });
        return expect(SharingInstance.prototype.set).wasCalledWith({
          funky: 'options'
        });
      });
      _when("user is anonymous", function() {
        beforeEach(function() {
          return this.hoodie.account.username = void 0;
        });
        it("should use the SharingHoodie", function() {
          var sharing;
          sharing = new SharingInstance;
          return expect(sharing.hoodie.constructor).toBe(SharingHoodie);
        });
        return it("should set anonymous to true", function() {
          var sharing;
          sharing = new SharingInstance;
          return expect(sharing.anonymous).toBeTruthy();
        });
      });
      return _when("user has an account", function() {
        beforeEach(function() {
          return this.hoodie.account.username = 'joe@example.com';
        });
        it("should use the SharingHoodie", function() {
          var sharing;
          sharing = new SharingInstance;
          return expect(sharing.hoodie.constructor).toBe(HoodieMock);
        });
        return it("should set anonymous to false", function() {
          var sharing;
          sharing = new SharingInstance;
          return expect(sharing.anonymous).toBeFalsy();
        });
      });
    });
  });
});
